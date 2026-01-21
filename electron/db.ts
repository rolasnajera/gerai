import sqlite3 from 'sqlite3';
import path from 'path';
import { Database } from 'sqlite3';

const sqliteVerbose = sqlite3.verbose();

let db: Database | undefined;

export function connect(customPath?: string): void {
    if (db) return;

    // Default to local for dev if no path provided, though main.js should provide one
    // dirname might change depending on the build structure, but tsup usually bundles relatively, or we rely on main.ts passing the path
    const targetPath = customPath || path.resolve(__dirname, 'gerai.db');
    console.log("Database path:", targetPath);

    db = new sqliteVerbose.Database(targetPath, (err: Error | null) => {
        if (err) {
            console.error('Error opening database', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            initDb();
        }
    });
}

export function initDb(): void {
    if (!db) return;

    db.serialize(() => {
        // Enable Foreign Keys
        db!.run("PRAGMA foreign_keys = ON");

        // Create Categories Table
        db!.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT,
            description TEXT,
            sort_order INTEGER DEFAULT 0
        )`);

        // Create Subcategories Table
        db!.run(`CREATE TABLE IF NOT EXISTS subcategories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            default_model TEXT,
            system_prompt TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        )`);

        // Create Context Table (localized memory)
        db!.run(`CREATE TABLE IF NOT EXISTS context (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            subcategory_id INTEGER,
            conversation_id INTEGER,
            content TEXT NOT NULL,
            source TEXT DEFAULT 'manual', -- 'manual' or 'ai'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )`);

        // Create Conversations Table
        db!.run(`CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subcategory_id INTEGER,
            title TEXT DEFAULT 'New Chat',
            system_prompt TEXT DEFAULT 'You are a helpful assistant.',
            model TEXT DEFAULT 'gpt-5-nano',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL
        )`);

        // Create Messages Table
        db!.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            model TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )`);

        // Migration to add subcategory_id to conversations if missing
        db!.all("PRAGMA table_info(conversations)", (err: Error | null, rows: any[]) => {
            if (err) return;
            const hasSubCat = rows.some(row => row.name === 'subcategory_id');
            if (!hasSubCat) {
                db!.run("ALTER TABLE conversations ADD COLUMN subcategory_id INTEGER", (err) => {
                    if (!err) console.log("Added subcategory_id to conversations");
                });
            }
        });

        // Migration to add last_response_id if missing
        db!.all("PRAGMA table_info(conversations)", (err: Error | null, rows: any[]) => {
            if (err) {
                console.error("Error checking table info:", err);
                return;
            }
            const hasColumn = rows.some(row => row.name === 'last_response_id');
            if (!hasColumn) {
                db!.run("ALTER TABLE conversations ADD COLUMN last_response_id TEXT", (err: Error | null) => {
                    if (err) {
                        console.error("Error adding last_response_id column:", err);
                    } else {
                        console.log("Successfully added last_response_id column to conversations.");
                    }
                });
            }
        });

        // Migration to add model to messages if missing
        db!.all("PRAGMA table_info(messages)", (err: Error | null, rows: any[]) => {
            if (err) {
                console.error("Error checking message table info:", err);
                return;
            }
            const hasModel = rows.some(row => row.name === 'model');
            if (!hasModel) {
                db!.run("ALTER TABLE messages ADD COLUMN model TEXT", (err: Error | null) => {
                    if (err) {
                        console.error("Error adding model column to messages:", err);
                    } else {
                        console.log("Successfully added model column to messages.");
                    }
                });
            }
        });

        // Migration to add citations to messages if missing
        db!.all("PRAGMA table_info(messages)", (err: Error | null, rows: any[]) => {
            if (err) return;
            const hasCitations = rows.some(row => row.name === 'citations');
            if (!hasCitations) {
                db!.run("ALTER TABLE messages ADD COLUMN citations TEXT", (err: Error | null) => {
                    if (!err) console.log("Added citations column to messages");
                });
            }
        });

        // Migration to add default_model to subcategories if missing
        db!.all("PRAGMA table_info(subcategories)", (err: Error | null, rows: any[]) => {
            if (err) {
                console.error("Error checking subcategories table info:", err);
                return;
            }
            const hasDefaultModel = rows.some(row => row.name === 'default_model');
            if (!hasDefaultModel) {
                db!.run("ALTER TABLE subcategories ADD COLUMN default_model TEXT", (err: Error | null) => {
                    if (err) {
                        console.error("Error adding default_model column to subcategories:", err);
                    } else {
                        console.log("Successfully added default_model column to subcategories.");
                    }
                });
            }
            const hasSortOrder = rows.some(row => row.name === 'sort_order');
            if (!hasSortOrder) {
                db!.run("ALTER TABLE subcategories ADD COLUMN sort_order INTEGER DEFAULT 0", (err: Error | null) => {
                    if (err) {
                        console.error("Error adding sort_order column to subcategories:", err);
                    } else {
                        console.log("Successfully added sort_order column to subcategories.");
                    }
                });
            }
        });

        // Migration to add system_prompt to subcategories if missing
        db!.all("PRAGMA table_info(subcategories)", (err: Error | null, rows: any[]) => {
            if (err) {
                console.error("Error checking subcategories table info for system_prompt:", err);
                return;
            }
            const hasSystemPrompt = rows.some(row => row.name === 'system_prompt');
            if (!hasSystemPrompt) {
                db!.run("ALTER TABLE subcategories ADD COLUMN system_prompt TEXT", (err: Error | null) => {
                    if (err) {
                        console.error("Error adding system_prompt column to subcategories:", err);
                    } else {
                        console.log("Successfully added system_prompt column to subcategories.");
                    }
                });
            }
        });

        // Migration to add source and updated_at to context if missing
        db!.all("PRAGMA table_info(context)", (err: Error | null, rows: any[]) => {
            if (err) return;
            const hasSource = rows.some(row => row.name === 'source');
            if (!hasSource) {
                db!.run("ALTER TABLE context ADD COLUMN source TEXT DEFAULT 'manual'");
            }
            const hasUpdatedAt = rows.some(row => row.name === 'updated_at');
            if (!hasUpdatedAt) {
                // Cannot add a column with non-constant default like CURRENT_TIMESTAMP in some SQLite versions
                db!.run("ALTER TABLE context ADD COLUMN updated_at DATETIME", (err) => {
                    if (!err) {
                        db!.run("UPDATE context SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
                    }
                });
            }
        });

        // Seed default categories
        const defaultCategories = [
            { name: 'Projects', icon: 'briefcase', sort_order: 1 },
            { name: 'Areas', icon: 'grid', sort_order: 2 },
            { name: 'Resources', icon: 'book', sort_order: 3 },
            { name: 'Archives', icon: 'archive', sort_order: 4 }
        ];
        db!.get("SELECT COUNT(*) as count FROM categories", (err, row: { count: number }) => {
            if (!err && row.count === 0) {
                const stmt = db!.prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)");
                defaultCategories.forEach(cat => {
                    stmt.run(cat.name, cat.icon, cat.sort_order);
                });
                stmt.finalize();
                console.log("Seeded default categories");
            }
        });

        // Create Model Providers Table
        db!.run(`CREATE TABLE IF NOT EXISTS model_providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_key TEXT,
            is_active INTEGER DEFAULT 0,
            config TEXT, -- JSON string for additional config
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Provider Models Table
        db!.run(`CREATE TABLE IF NOT EXISTS provider_models (
            id TEXT PRIMARY KEY,
            provider_id TEXT,
            name TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 0,
            capabilities TEXT, -- JSON string of capabilities (vision, etc.)
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (provider_id) REFERENCES model_providers(id) ON DELETE CASCADE
        )`);

        // Seed default providers
        const defaultProviders = [
            { id: 'openai', name: 'OpenAI' },
            { id: 'anthropic', name: 'Anthropic' },
            { id: 'gemini', name: 'Google Gemini' },
            { id: 'grok', name: 'xAI Grok' },
            { id: 'mistral', name: 'Mistral AI' },
            { id: 'mock', name: 'Mock Model (Development)' }
        ];

        const seedProviders = async () => {
            for (const p of defaultProviders) {
                db!.run(
                    "INSERT INTO model_providers (id, name, is_active) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING",
                    [p.id, p.name, p.id === 'mock' ? 1 : 0]
                );
            }
            // Seed mock model if it doesn't exist
            db!.run("INSERT INTO provider_models (id, provider_id, name, is_enabled) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
                ['mock', 'mock', 'Mock Model', 1]);
        };

        seedProviders();
    });
}

// Helper to run a query returning Promise (for inserts/updates)
interface RunResult {
    id: number;
    changes: number;
}

export function run(sql: string, params: any[] = []): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error("Database not connected"));
        }
        db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
            if (err) {
                console.log('Error running sql ' + sql);
                console.log(err);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

// Helper to get a single row
export function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error("Database not connected"));
        }
        db.get(sql, params, (err: Error | null, result: T) => {
            if (err) {
                console.log('Error running sql: ' + sql);
                console.log(err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Helper to get all rows
export function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject(new Error("Database not connected"));
        }
        db.all(sql, params, (err: Error | null, rows: T[]) => {
            if (err) {
                console.log('Error running sql: ' + sql);
                console.log(err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export async function upsertContext(params: {
    content: string,
    source: 'manual' | 'ai',
    subcategoryId?: number | null,
    categoryId?: number | null
}): Promise<number> {
    const { content, source, subcategoryId, categoryId } = params;
    console.log('[DB] upsertContext params:', { content: content.substring(0, 20) + '...', source, subcategoryId, categoryId });

    // Check if an exact match exists for this subcategory/general
    let existing: { id: number } | undefined;
    if (subcategoryId) {
        existing = await get<{ id: number }>('SELECT id FROM context WHERE content = ? AND subcategory_id = ?', [content, subcategoryId]);
    } else {
        existing = await get<{ id: number }>('SELECT id FROM context WHERE content = ? AND subcategory_id IS NULL', [content]);
    }

    if (existing) {
        console.log('Memory de-duplication: updating existing row', existing.id);
        await run('UPDATE context SET content = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [content, source, existing.id]);
        return existing.id;
    } else {
        console.log('Memory system: inserting new fact');
        const result = await run(
            'INSERT INTO context (content, source, subcategory_id, category_id) VALUES (?, ?, ?, ?)',
            [content, source, subcategoryId || null, categoryId || null]
        );
        return result.id;
    }
}
