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

            // 3. Build Context
            // We need previous messages
            const history = await all('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [cid]);
            // Filter out the one we just added? No, OpenAI needs it. 
            // Actually `history` contains it now.
            // Construct payload
            const messagesPayload = [
                { role: "system", content: systemPrompt || "You are a helpful assistant." },
                ...history.map(m => ({ role: m.role, content: m.content }))
            ];

            // 4. Call OpenAI
            const aiContent = await getOpenAIResponse(apiKey, messagesPayload, model || 'gpt-5-nano');

            // 5. Save AI Msg
            await run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', [cid, 'assistant', aiContent]);

            // 6. Update Title if it's "New Chat" and early in convo
            // Check if title is still New Chat
            const conv = await get('SELECT title FROM conversations WHERE id = ?', [cid]);
            if (conv && conv.title === 'New Chat') {
                // If history is short (e.g. just user msg + ai msg + system, so < 4?)
                if (history.length <= 4) {
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
