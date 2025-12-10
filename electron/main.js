const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { run, get, all } = require('../db');
const { getOpenAIResponse } = require('../services/openai');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        titleBarStyle: 'hiddenInset', // Mac-like nice titlebar
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    if (process.env.npm_lifecycle_event === 'electron:dev') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    // Initialize DB directly in userData
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'gerai.db');

    // Ensure the function is called
    const { connect } = require('../db');
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

    ipcMain.handle('get-messages', async (event, cid) => {
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

    ipcMain.handle('rename-conversation', async (event, { id, title }) => {
        try {
            await run('UPDATE conversations SET title = ? WHERE id = ?', [title, id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('delete-conversation', async (event, id) => {
        try {
            await run('DELETE FROM conversations WHERE id = ?', [id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('send-message', async (event, { conversationId, message, model, apiKey, systemPrompt }) => {
        let cid = conversationId;

        try {
            // 1. If new chat needed
            if (!cid) {
                const res = await run('INSERT INTO conversations (title) VALUES (?)', ['New Chat']);
                cid = res.id;
            }

            // 2. Save User Msg
            await run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [cid, 'user', message]);

            // 3. Prepare OpenAI Call
            // Get the last_response_id to continue conversation if available
            const conv = await get('SELECT last_response_id, title FROM conversations WHERE id = ?', [cid]);
            const lastResponseId = conv ? conv.last_response_id : null;
            const currentTitle = conv ? conv.title : 'New Chat';

            // If we have a previous ID, we check if we need instructions. 
            // Usually instructions are set at the start (Turn 1). 
            // If we are starting a new chain (no ID), pass instructions.
            // If systemPrompt is provided explicitly, we can pass it, but usually standard behavior is sticky instructions.
            // For now, if it's Turn 1 (no lastResponseId), we pass instructions.
            const instructions = !lastResponseId ? (systemPrompt || "You are a helpful assistant.") : undefined;

            // 4. Call OpenAI
            console.log("Calling OpenAI with instructions:", instructions ? "YES" : "NO", "LastID:", lastResponseId);
            // Now we pass 'message' as input, not the whole history array
            const aiResponse = await getOpenAIResponse(
                apiKey,
                message,
                model || 'gpt-5-nano',
                instructions,
                lastResponseId
            );

            console.log("AI Response Object:", JSON.stringify(aiResponse, null, 2));

            const aiContent = aiResponse.output_text;
            const newResponseId = aiResponse.response_id;

            // 5. Save AI Msg
            await run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [cid, 'assistant', aiContent]);

            // 6. Update Conversation State (last_response_id)
            if (newResponseId) {
                console.log("Updating conversation", cid, "with newResponseId:", newResponseId);
                await run('UPDATE conversations SET last_response_id = ? WHERE id = ?', [newResponseId, cid]);
            } else {
                console.warn("No newResponseId received from OpenAI service.");
            }

            // 7. Update Title if it's "New Chat" and early in convo
            // We can check message count or just use the logic we had.
            if (currentTitle === 'New Chat') {
                const countResult = await get('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', [cid]);
                if (countResult && countResult.count <= 4) {
                    const newTitle = message.substring(0, 30) + (message.length > 30 ? "..." : "");
                    await run('UPDATE conversations SET title = ? WHERE id = ?', [newTitle, cid]);
                }
            }

            return { content: aiContent, conversationId: cid };

        } catch (err) {
            console.error('IPC send-message error:', err);
            // Return error as content so UI can show it? Or throw?
            // Throwing allows UI catch block to handle it.
            throw new Error(err.message || 'Error processing message');
        }
    });
}
