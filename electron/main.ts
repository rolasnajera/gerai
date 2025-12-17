import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { run, get, all, connect } from './db';
import { getOpenAIResponse } from './services/openai';

let mainWindow: BrowserWindow | undefined;

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

    ipcMain.handle('create-conversation', async () => {
        try {
            const result = await run('INSERT INTO conversations (title) VALUES (?)', ['New Chat']);
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

    ipcMain.handle('send-message', async (_event: IpcMainInvokeEvent, { conversationId, message, model, apiKey, systemPrompt }: { conversationId?: number, message: string, model?: string, apiKey: string, systemPrompt?: string }) => {
        let cid = conversationId;
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // 1. If a new chat is needed
            if (!cid) {
                const res = await run('INSERT INTO conversations (title) VALUES (?)', ['New Chat']);
                cid = res.id;
            }

            // 2. Save User Msg
            await run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [cid, 'user', message]);

            // 3. Prepare OpenAI Call
            const conv = await get<{ last_response_id: string, title: string }>('SELECT last_response_id, title FROM conversations WHERE id = ?', [cid]);
            const lastResponseId = conv ? conv.last_response_id : undefined;
            const currentTitle = conv ? conv.title : 'New Chat';

            const instructions = !lastResponseId ? (systemPrompt || "You are a helpful assistant.") : undefined;

            console.log("Calling OpenAI with streaming for request:", requestId);

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
                model || 'gpt-5-nano',
                instructions,
                lastResponseId
            );

            console.log("AI Response Object:", JSON.stringify(aiResponse, null, 2));

            const aiContent = aiResponse.output_text;
            const newResponseId = aiResponse.response_id;

            // 5. Save AI Msg
            await run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [cid, 'assistant', aiContent]);

            // 6. Update Conversation State
            if (newResponseId) {
                console.log("Updating conversation", cid, "with newResponseId:", newResponseId);
                await run('UPDATE conversations SET last_response_id = ? WHERE id = ?', [newResponseId, cid]);
            } else {
                console.warn("No newResponseId received from OpenAI service.");
            }

            // 7. Update Title if it's "New Chat"
            if (currentTitle === 'New Chat') {
                const countResult = await get<{ count: number }>('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', [cid]);
                if (countResult && countResult.count <= 4) {
                    const newTitle = message.substring(0, 30) + (message.length > 30 ? "..." : "");
                    await run('UPDATE conversations SET title = ? WHERE id = ?', [newTitle, cid]);
                }
            }

            // Emit completion event
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('stream-complete', {
                    requestId,
                    conversationId: cid,
                    content: aiContent,
                    response_id: newResponseId
                });
            }

            return { requestId, conversationId: cid };

        } catch (err: any) {
            console.error('IPC send-message error:', err);

            // Emit error event
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('stream-error', {
                    requestId,
                    error: err.message || 'Error processing message'
                });
            }

            throw new Error(err.message || 'Error processing message');
        }
    });
}
