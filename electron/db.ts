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

        // Create Conversations Table
        db!.run(`CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT DEFAULT 'New Chat',
            system_prompt TEXT DEFAULT 'You are a helpful assistant.',
            model TEXT DEFAULT 'gpt-5-nano',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Messages Table
        db!.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )`);

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
