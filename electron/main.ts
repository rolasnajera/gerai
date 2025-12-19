import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { run, get, all, connect } from './db';
import { getOpenAIResponse } from './services/openai';

let mainWindow: BrowserWindow | undefined;

// Track active streaming requests
const activeStreams = new Map<string, AbortController>();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        titleBarStyle: 'hiddenInset', // Mac-like nice title bar
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // tsup outputs to the same dir
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (process.env.npm_lifecycle_event === 'electron:dev' || process.env.npm_lifecycle_event === 'electron:watch') {
        mainWindow.loadURL('http://localhost:5173').catch(e => console.error('Failed to load URL:', e));
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(e => console.error('Failed to load file:', e));
    }
}

app.whenReady().then(() => {
    // Determine if we are running in dev mode
    const isDev = process.env.npm_lifecycle_event === 'electron:dev' || process.env.npm_lifecycle_event === 'electron:watch';

    // Initialize DB
    // Dev: Use current working directory (project root)
    // Prod: Use OS standard User Data directory
    const dbFolder = isDev ? process.cwd() : app.getPath('userData');
    const dbPath = path.join(dbFolder, 'gerai.db');

    // Connect to DB
    connect(dbPath);

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    setupIPC();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function setupIPC() {
    ipcMain.handle('get-conversations', async () => {
        try {
            return await all('SELECT * FROM conversations ORDER BY created_at DESC');
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('get-messages', async (_event: IpcMainInvokeEvent, cid: number) => {
        try {
            if (!cid) return [];
            return await all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [cid]);
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('create-conversation', async (_event: IpcMainInvokeEvent, { model, systemPrompt }: { model?: string, systemPrompt?: string } = {}) => {
        try {
            const result = await run(
                'INSERT INTO conversations (title, model, system_prompt) VALUES (?, ?, ?)',
                ['New Chat', model || 'gpt-5-nano', systemPrompt || 'You are a helpful assistant.']
            );
            return { id: result.id, title: 'New Chat' };
        } catch (err) {
            console.error(err);
            throw err;
        }
    });

    ipcMain.handle('rename-conversation', async (_event: IpcMainInvokeEvent, { id, title }: { id: number, title: string }) => {
        try {
            await run('UPDATE conversations SET title = ? WHERE id = ?', [title, id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('delete-conversation', async (_event: IpcMainInvokeEvent, id: number) => {
        try {
            await run('DELETE FROM conversations WHERE id = ?', [id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('send-message', async (_event: IpcMainInvokeEvent, { conversationId, message, model, apiKey, systemPrompt, requestId }: { conversationId?: number, message: string, model?: string, apiKey: string, systemPrompt?: string, requestId: string }) => {
        let cid = conversationId;
        // Use the requestId provided by the frontend
        // const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // 1. If a new chat is needed
            if (!cid) {
                const res = await run(
                    'INSERT INTO conversations (title, model, system_prompt) VALUES (?, ?, ?)',
                    ['New Chat', model || 'gpt-5-nano', systemPrompt || 'You are a helpful assistant.']
                );
                cid = res.id;
            } else {
                // Update model and system prompt for existing conversation if provided
                if (model || systemPrompt) {
                    const updates: string[] = [];
                    const params: any[] = [];
                    if (model) {
                        updates.push('model = ?');
                        params.push(model);
                    }
                    if (systemPrompt) {
                        updates.push('system_prompt = ?');
                        params.push(systemPrompt);
                    }
                    params.push(cid);
                    await run(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`, params);
                }
            }

            // 2. Save User Msg
            const messageModel = model || 'gpt-5-nano';
            await run('INSERT INTO messages (conversation_id, role, content, model) VALUES (?, ?, ?, ?)', [cid, 'user', message, messageModel]);

            // 3. Prepare OpenAI Call
            const conv = await get<{ last_response_id: string, title: string }>('SELECT last_response_id, title FROM conversations WHERE id = ?', [cid]);
            const lastResponseId = conv ? conv.last_response_id : undefined;
            const currentTitle = conv ? conv.title : 'New Chat';

            const instructions = !lastResponseId ? (systemPrompt || "You are a helpful assistant.") : undefined;

            console.log("Calling OpenAI with streaming for request:", requestId);


            // Create AbortController
            const abortController = new AbortController();
            activeStreams.set(requestId, abortController);

            // 4. Call OpenAI with streaming callback
            const aiResponse = await getOpenAIResponse(
                apiKey,
                message,
                (chunk: string) => {
                    // Emit each delta to the renderer in real-time
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('stream-chunk', { requestId, chunk });
                    }
                },
                messageModel,
                instructions,
                lastResponseId,
                abortController.signal
            );

            // Clean up
            activeStreams.delete(requestId);

            let aiContent = aiResponse.output_text;
            const newResponseId = aiResponse.response_id;
            const isAborted = aiResponse.aborted;

            if (isAborted) {
                aiContent += (aiContent ? "\n\n" : "") + "[Response canceled]";
            }

            // 5. Save AI Msg (even if aborted, if there's content or it was aborted)
            if (aiContent || isAborted) {
                await run('INSERT INTO messages (conversation_id, role, content, model) VALUES (?, ?, ?, ?)', [cid, 'assistant', aiContent || '[Response canceled]', messageModel]);
            }

            // 6. Update Conversation State
            if (newResponseId) {
                console.log("Updating conversation", cid, "with newResponseId:", newResponseId);
                await run('UPDATE conversations SET last_response_id = ? WHERE id = ?', [newResponseId, cid]);
            }

            // 7. Update Title if it's "New Chat"
            if (currentTitle === 'New Chat') {
                const countResult = await get<{ count: number }>('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', [cid]);
                if (countResult && countResult.count <= 4) {
                    const newTitle = message.substring(0, 30) + (message.length > 30 ? "..." : "");
                    await run('UPDATE conversations SET title = ? WHERE id = ?', [newTitle, cid]);
                }
            }

            // Emit completion event (or stopped event)
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('stream-complete', {
                    requestId,
                    conversationId: cid,
                    content: aiContent,
                    response_id: newResponseId,
                    aborted: isAborted
                });
            }

            return { requestId, conversationId: cid, aborted: isAborted };

        } catch (err: any) {
            console.error('IPC send-message error:', err);

            // Emit error event
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('stream-error', {
                    requestId,
                    error: err.message || 'Error processing message'
                });
            }

            // Clean up on error
            activeStreams.delete(requestId);
            throw new Error(err.message || 'Error processing message');
        }
    });

    ipcMain.handle('cancel-message', async (_event: IpcMainInvokeEvent, requestId: string) => {
        try {
            const abortController = activeStreams.get(requestId);
            if (abortController) {
                console.log('Cancelling stream:', requestId);
                abortController.abort();
                activeStreams.delete(requestId);
                return { success: true };
            }
            return { success: false, message: 'Request not found' };
        } catch (err: any) {
            console.error('Cancel error:', err);
            return { success: false, message: err.message };
        }
    });
}
