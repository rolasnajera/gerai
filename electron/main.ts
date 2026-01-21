import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, shell } from 'electron';
import path from 'path';
import { run, get, all, connect, upsertContext } from './db';
import { getOpenAIResponse, extractMemories } from './services/openai';
import { getMockResponse } from './services/mock';
import { encryptString, decryptString } from './encryption';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | undefined;

// Track active streaming requests
const activeStreams = new Map<string, AbortController>();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        titleBarStyle: 'hiddenInset', // Mac-like nice title bar
        icon: path.join(__dirname, '../build/icon.png'),
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

    // Set about panel options for macOS and other platforms
    app.setAboutPanelOptions({
        applicationName: 'GERAI',
        applicationVersion: app.getVersion(),
        version: app.getVersion(),
        copyright: 'Copyright © 2026 Rolas Najera',
        credits: 'Built with React, Electron, and SQLite',
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    setupIPC();

    // Initialize auto-updater (only in production)
    if (!isDev) {
        initAutoUpdater();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function initAutoUpdater() {
    // Configure auto-updater
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates on app start
    autoUpdater.checkForUpdatesAndNotify();

    // Check for updates every 4 hours
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 4 * 60 * 60 * 1000);

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-checking');
        }
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-available', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseName: info.releaseName,
            });
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available. Current version:', info.version);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        console.log(`Download progress: ${progressObj.percent.toFixed(2)}%`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-download-progress', {
                percent: progressObj.percent,
                bytesPerSecond: progressObj.bytesPerSecond,
                transferred: progressObj.transferred,
                total: progressObj.total,
            });
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-downloaded', {
                version: info.version,
            });
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err);
        const isSignatureError = err.message.includes('signature') ||
            err.message.includes('validation') ||
            err.message.includes('SQRLCodeSignatureErrorDomain');

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-error', {
                message: err.message,
                isSignatureError
            });
        }
    });
}

function setupIPC() {
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('get-categories', async () => {
        try {
            return await all('SELECT * FROM categories ORDER BY sort_order ASC');
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('create-category', async (_event: IpcMainInvokeEvent, { name, icon, description, sortOrder }: { name: string, icon?: string, description?: string, sortOrder?: number }) => {
        try {
            const result = await run(
                'INSERT INTO categories (name, icon, description, sort_order) VALUES (?, ?, ?, ?)',
                [name, icon || 'folder', description || '', sortOrder || 0]
            );
            return { id: result.id };
        } catch (err) {
            console.error(err);
            throw err;
        }
    });

    ipcMain.handle('update-category', async (_event: IpcMainInvokeEvent, { id, name, icon, description, sortOrder }: { id: number, name: string, icon?: string, description?: string, sortOrder?: number }) => {
        try {
            await run('UPDATE categories SET name = ?, icon = ?, description = ?, sort_order = ? WHERE id = ?', [name, icon || 'folder', description || '', sortOrder || 0, id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('delete-category', async (_event: IpcMainInvokeEvent, id: number) => {
        try {
            await run('DELETE FROM categories WHERE id = ?', [id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('reorder-categories', async (_event: IpcMainInvokeEvent, categoryIds: number[]) => {
        try {
            await run('BEGIN TRANSACTION');
            for (let i = 0; i < categoryIds.length; i++) {
                await run('UPDATE categories SET sort_order = ? WHERE id = ?', [i, categoryIds[i]]);
            }
            await run('COMMIT');
            return true;
        } catch (err) {
            await run('ROLLBACK');
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('sort-categories-alphabetically', async () => {
        try {
            const categories = await all('SELECT id FROM categories ORDER BY name COLLATE NOCASE ASC');
            await run('BEGIN TRANSACTION');
            for (let i = 0; i < categories.length; i++) {
                await run('UPDATE categories SET sort_order = ? WHERE id = ?', [i, categories[i].id]);
            }
            await run('COMMIT');
            return true;
        } catch (err) {
            await run('ROLLBACK');
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('get-subcategories', async () => {
        try {
            return await all('SELECT * FROM subcategories ORDER BY sort_order ASC');
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('create-subcategory', async (_event: IpcMainInvokeEvent, { categoryId, name, description, context, defaultModel, systemPrompt }: { categoryId: number, name: string, description?: string, context?: string[], defaultModel?: string, systemPrompt?: string }) => {
        try {
            const result = await run(
                'INSERT INTO subcategories (category_id, name, description, default_model, system_prompt) VALUES (?, ?, ?, ?, ?)',
                [categoryId, name, description || '', defaultModel || null, systemPrompt || null]
            );
            const subcategoryId = result.id;

            if (context && context.length > 0) {
                await run('BEGIN TRANSACTION');
                try {
                    for (const content of context) {
                        if (content.trim()) {
                            await run('INSERT INTO context (subcategory_id, content) VALUES (?, ?)', [subcategoryId, content]);
                        }
                    }
                    await run('COMMIT');
                } catch (err) {
                    await run('ROLLBACK');
                    throw err;
                }
            }

            return { id: subcategoryId };
        } catch (err) {
            console.error(err);
            throw err;
        }
    });

    ipcMain.handle('reorder-subcategories', async (_event: IpcMainInvokeEvent, subcategoryIds: number[]) => {
        try {
            await run('BEGIN TRANSACTION');
            for (let i = 0; i < subcategoryIds.length; i++) {
                await run('UPDATE subcategories SET sort_order = ? WHERE id = ?', [i, subcategoryIds[i]]);
            }
            await run('COMMIT');
            return true;
        } catch (err) {
            await run('ROLLBACK');
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('update-subcategory', async (_event: IpcMainInvokeEvent, { id, name, description, context, defaultModel, systemPrompt }: { id: number, name: string, description?: string, context?: string[], defaultModel?: string, systemPrompt?: string }) => {
        try {
            await run('UPDATE subcategories SET name = ?, description = ?, default_model = ?, system_prompt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, description || '', defaultModel || null, systemPrompt || null, id]);

            if (context) {
                // Simplified sync: delete old context and insert new
                await run('BEGIN TRANSACTION');
                try {
                    await run('DELETE FROM context WHERE subcategory_id = ?', [id]);
                    for (const content of context) {
                        if (content.trim()) {
                            await run('INSERT INTO context (subcategory_id, content) VALUES (?, ?)', [id, content]);
                        }
                    }
                    await run('COMMIT');
                } catch (err) {
                    await run('ROLLBACK');
                    throw err;
                }
            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('delete-subcategory', async (_event: IpcMainInvokeEvent, id: number) => {
        try {
            await run('DELETE FROM subcategories WHERE id = ?', [id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('get-subcategory-context', async (_event: IpcMainInvokeEvent, subcategoryId: number) => {
        try {
            return await all('SELECT * FROM context WHERE subcategory_id = ?', [subcategoryId]);
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('get-all-context', async () => {
        try {
            return await all(`
                SELECT c.*, s.name as subcategory_name, cat.name as category_name 
                FROM context c 
                LEFT JOIN subcategories s ON c.subcategory_id = s.id 
                LEFT JOIN categories cat ON c.category_id = cat.id 
                ORDER BY c.created_at DESC
            `);
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('get-general-context', async () => {
        try {
            return await all('SELECT * FROM context WHERE subcategory_id IS NULL AND source = "manual" ORDER BY created_at ASC');
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('update-general-context', async (_event: IpcMainInvokeEvent, context: string[]) => {
        try {
            await run('BEGIN TRANSACTION');
            try {
                await run('DELETE FROM context WHERE subcategory_id IS NULL AND source = "manual"');
                for (const content of context) {
                    if (content.trim()) {
                        await run('INSERT INTO context (content, source, subcategory_id) VALUES (?, "manual", null)', [content]);
                    }
                }
                await run('COMMIT');
                return true;
            } catch (err) {
                await run('ROLLBACK');
                throw err;
            }
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('update-context-item', async (_event: IpcMainInvokeEvent, { id, content, subcategoryId }: { id: number, content: string, subcategoryId?: number | null }) => {
        try {
            await run('UPDATE context SET content = ?, subcategory_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, subcategoryId === undefined ? null : subcategoryId, id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('delete-context-item', async (_event: IpcMainInvokeEvent, id: number) => {
        try {
            await run('DELETE FROM context WHERE id = ?', [id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

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

    ipcMain.handle('create-conversation', async (_event: IpcMainInvokeEvent, { model, systemPrompt, subcategoryId }: { model?: string, systemPrompt?: string, subcategoryId?: number } = {}) => {
        try {
            const isDev = !app.isPackaged;
            let finalModel = model;
            let finalSystemPrompt = systemPrompt;
            // If a subcategory is provided, try to find its default model and system prompt
            if (subcategoryId) {
                const sub = await get<{ default_model: string, system_prompt: string }>('SELECT default_model, system_prompt FROM subcategories WHERE id = ?', [subcategoryId]);
                if (sub) {
                    if (!finalModel && sub.default_model) {
                        finalModel = sub.default_model;
                    }
                    if (!finalSystemPrompt && sub.system_prompt) {
                        finalSystemPrompt = sub.system_prompt;
                    }
                }
            }

            if (!finalModel) {
                finalModel = isDev ? 'mock' : 'gpt-5-nano';
            }

            const result = await run(
                'INSERT INTO conversations (title, model, system_prompt, subcategory_id) VALUES (?, ?, ?, ?)',
                ['New Chat', finalModel, finalSystemPrompt || 'You are a helpful assistant.', subcategoryId || null]
            );
            return { id: result.id, title: 'New Chat', subcategory_id: subcategoryId, model: finalModel };
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

    ipcMain.handle('move-conversation', async (_event: IpcMainInvokeEvent, { id, subcategoryId }: { id: number, subcategoryId: number | null }) => {
        try {
            await run('UPDATE conversations SET subcategory_id = ? WHERE id = ?', [subcategoryId, id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('get-providers', async () => {
        try {
            const providers = await all('SELECT * FROM model_providers ORDER BY name ASC');
            // Hide mock provider in production
            if (app.isPackaged) {
                return providers.filter((p: any) => p.id !== 'mock');
            }
            return providers;
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('update-provider', async (_event: IpcMainInvokeEvent, { id, apiKey, isActive, config }: { id: string, apiKey?: string, isActive?: boolean, config?: string }) => {
        try {
            console.log(`[IPC] update-provider: id=${id}, isActive=${isActive}, hasApiKey=${!!apiKey}`);
            const updates: string[] = [];
            const params: any[] = [];

            if (apiKey !== undefined) {
                updates.push('api_key = ?');
                params.push(apiKey ? encryptString(apiKey) : null);
            }
            if (isActive !== undefined) {
                updates.push('is_active = ?');
                params.push(isActive ? 1 : 0);
            }
            if (config !== undefined) {
                updates.push('config = ?');
                params.push(config);
            }

            if (updates.length > 0) {
                params.push(id);
                await run(`UPDATE model_providers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
            }

            // If API key is removed, also remove associated models to prevent stale data
            if (apiKey === null) {
                await run('DELETE FROM provider_models WHERE provider_id = ?', [id]);
            }

            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('get-provider-models', async (_event: IpcMainInvokeEvent, providerId: string) => {
        try {
            const models = await all('SELECT * FROM provider_models WHERE provider_id = ? ORDER BY name ASC', [providerId]);
            // Hide mock models in production
            if (app.isPackaged && providerId === 'mock') {
                return [];
            }
            return models;
        } catch (err) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('toggle-provider-model', async (_event: IpcMainInvokeEvent, { id, isEnabled }: { id: string, isEnabled: boolean }) => {
        try {
            console.log(`[IPC] toggle-provider-model: id=${id}, isEnabled=${isEnabled}`);
            await run('UPDATE provider_models SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isEnabled ? 1 : 0, id]);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('fetch-remote-models', async (_event: IpcMainInvokeEvent, providerId: string) => {
        try {
            console.log(`[IPC] fetch-remote-models: providerId=${providerId}`);
            if (providerId !== 'openai') {
                return { success: false, message: 'Only OpenAI model fetching is implemented for now.' };
            }

            const provider = await get<{ api_key: string }>('SELECT api_key FROM model_providers WHERE id = ?', [providerId]);
            if (!provider || !provider.api_key) {
                return { success: false, message: 'API key not configured for this provider.' };
            }

            const apiKey = decryptString(provider.api_key);

            // Re-use OpenAI service or fetch directly
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                const err = await response.json();
                return { success: false, message: err.error?.message || 'Failed to fetch models' };
            }

            const data = await response.json();
            const models = data.data.filter((m: any) => m.id.startsWith('gpt-'));

            await run('BEGIN TRANSACTION');
            try {
                for (const model of models) {
                    await run(`
                        INSERT INTO provider_models (id, provider_id, name, is_enabled)
                        VALUES (?, 'openai', ?, 0)
                        ON CONFLICT(id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                    `, [model.id, model.id]);
                }
                await run('COMMIT');
            } catch (err) {
                await run('ROLLBACK');
                throw err;
            }

            return { success: true };
        } catch (err: any) {
            console.error(err);
            return { success: false, message: err.message };
        }
    });

    ipcMain.handle('send-message', async (_event: IpcMainInvokeEvent, { conversationId, message, model, systemPrompt, requestId }: { conversationId?: number, message: string, model?: string, systemPrompt?: string, requestId: string }) => {
        let cid = conversationId;
        // Use the requestId provided by the frontend
        // const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // 1. If a new chat is needed
            if (!cid) {
                const isDev = !app.isPackaged;
                const defaultModel = isDev ? 'mock' : 'gpt-5-nano';
                const res = await run(
                    'INSERT INTO conversations (title, model, system_prompt) VALUES (?, ?, ?)',
                    ['New Chat', model || defaultModel, systemPrompt || 'You are a helpful assistant.']
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
            const isDev = !app.isPackaged;
            const defaultModel = isDev ? 'mock' : 'gpt-5-nano';
            const messageModel = model || defaultModel;
            await run('INSERT INTO messages (conversation_id, role, content, model) VALUES (?, ?, ?, ?)', [cid, 'user', message, messageModel]);

            // 3. Prepare OpenAI Call
            const conv = await get<{ last_response_id: string, title: string, subcategory_id: number, system_prompt: string }>('SELECT last_response_id, title, subcategory_id, system_prompt FROM conversations WHERE id = ?', [cid]);
            const lastResponseId = conv ? conv.last_response_id : undefined;
            const currentTitle = conv ? conv.title : 'New Chat';
            const subcategoryId = conv ? conv.subcategory_id : undefined;

            let finalSystemPrompt = systemPrompt || (conv ? conv.system_prompt : "You are a helpful assistant.");
            let finalMessage = message;

            // 3.1 Fetch Context (Hierarchical: General + Subcategory)
            let combinedContext = "";

            // Fetch General Context
            const globalResults = await all<{ content: string }>('SELECT content FROM context WHERE subcategory_id IS NULL');
            if (globalResults.length > 0) {
                combinedContext += `[GENERAL MEMORY]\n${globalResults.map(r => r.content).join('\n')}\n\n`;
            }

            // Fetch Subcategory Context
            if (subcategoryId) {
                const subResults = await all<{ content: string }>('SELECT content FROM context WHERE subcategory_id = ?', [subcategoryId]);
                if (subResults.length > 0) {
                    combinedContext += `[SUBCATEGORY MEMORY]\n${subResults.map(r => r.content).join('\n')}\n\n`;
                }
            }

            if (combinedContext) {
                finalMessage = `${combinedContext}[USER MESSAGE]\n${message}`;
            }

            const instructions = !lastResponseId ? finalSystemPrompt : undefined;

            console.log("Calling OpenAI with streaming for request:", requestId);


            // Create AbortController
            const abortController = new AbortController();
            activeStreams.set(requestId, abortController);

            // 4. Call AI service (Mock or OpenAI)
            let aiResponse;
            if (messageModel === 'mock') {
                console.log("Using Mock Model for request:", requestId);
                aiResponse = await getMockResponse(
                    finalMessage,
                    (chunk: string) => {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('stream-chunk', { requestId, chunk });
                        }
                    },
                    abortController.signal
                );
            } else {
                // Fetch API Key from DB for the model's provider
                const modelInfo = await get<{ provider_id: string }>('SELECT provider_id FROM provider_models WHERE id = ?', [messageModel]);
                let finalApiKey = '';
                if (modelInfo) {
                    const provider = await get<{ api_key: string }>('SELECT api_key FROM model_providers WHERE id = ?', [modelInfo.provider_id]);
                    if (provider && provider.api_key) {
                        finalApiKey = decryptString(provider.api_key);
                    }
                }

                if (!finalApiKey) {
                    throw new Error(`API Key not found for model ${messageModel}`);
                }

                aiResponse = await getOpenAIResponse(
                    finalApiKey,
                    finalMessage,
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
            }

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

            // Extract memory/facts after a successful response
            // ONLY if it's NOT a general chat (incognito mode - subcategoryId is present)
            if (!isAborted && aiContent && messageModel !== 'mock' && subcategoryId) {
                const currentCid = cid;
                const currentSubcategoryId = subcategoryId;
                const userMsg = message;
                // Fire and forget so we don't block the UI
                (async () => {
                    try {
                        console.log("Extracting facts for conversation:", currentCid, "Subcategory ID:", currentSubcategoryId);

                        // Fetch API Key for memory extraction (using the same model's provider)
                        const modelInfo = await get<{ provider_id: string }>('SELECT provider_id FROM provider_models WHERE id = ?', [messageModel]);
                        let extractionApiKey = '';
                        if (modelInfo) {
                            const provider = await get<{ api_key: string }>('SELECT api_key FROM model_providers WHERE id = ?', [modelInfo.provider_id]);
                            if (provider && provider.api_key) {
                                extractionApiKey = decryptString(provider.api_key);
                            }
                        }

                        if (!extractionApiKey) {
                            console.warn("No API key found for memory extraction");
                            return;
                        }

                        const facts = await extractMemories(extractionApiKey, userMsg);
                        for (const fact of (facts as any[])) {
                            console.log("Upserting fact with subcategoryId:", currentSubcategoryId || null);
                            await upsertContext({
                                content: fact.content,
                                source: 'ai',
                                subcategoryId: currentSubcategoryId || null
                            });
                        }
                    } catch (e) {
                        console.error("Memory extraction failed:", e);
                    }
                })();
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

    ipcMain.handle('search-conversations', async (_event: IpcMainInvokeEvent, query: string) => {
        try {
            if (!query || query.trim().length === 0) return [];
            const searchTerm = `%${query}%`;
            return await all(`
                SELECT 
                    c.id, 
                    c.title, 
                    c.subcategory_id,
                    s.name as subcategory_name,
                    cat.name as category_name,
                    (SELECT content FROM messages WHERE conversation_id = c.id AND content LIKE ? LIMIT 1) as snippet
                FROM conversations c
                LEFT JOIN subcategories s ON c.subcategory_id = s.id
                LEFT JOIN categories cat ON s.category_id = cat.id
                WHERE c.title LIKE ? OR EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.id AND content LIKE ?)
                ORDER BY c.created_at DESC
                LIMIT 100
            `, [searchTerm, searchTerm, searchTerm]);
        } catch (err) {
            console.error('Search error:', err);
            return [];
        }
    });

    // Auto-update IPC handlers
    ipcMain.handle('check-for-updates', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return { success: true, updateInfo: result?.updateInfo };
        } catch (err: any) {
            console.error('Check for updates error:', err);
            return { success: false, message: err.message };
        }
    });

    ipcMain.handle('install-update', async () => {
        try {
            console.log('Install update requested by user');
            // Use setImmediate to ensure the response is sent before quitting
            setImmediate(() => {
                console.log('Calling quitAndInstall...');
                // quitAndInstall(isSilent, isForceRunAfter)
                // isSilent: false = show normal quit behavior
                // isForceRunAfter: true = restart app after install
                autoUpdater.quitAndInstall(false, true);
            });
            return { success: true };
        } catch (err: any) {
            console.error('Install update error:', err);
            return { success: false, message: err.message };
        }
    });

    ipcMain.handle('open-releases-page', async () => {
        shell.openExternal('https://github.com/rolasnajera/gerai/releases');
    });
}
