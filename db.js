const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

function connect(customPath) {
    if (db) return;

    // Default to local for dev if no path provided, though main.js should provide one
    const targetPath = customPath || path.resolve(__dirname, 'gerai.db');
    console.log("Database path:", targetPath);

    db = new sqlite3.Database(targetPath, (err) => {
        if (err) {
            console.error('Error opening database', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            initDb();
        }
    });
}

function initDb() {
    db.serialize(() => {
        // Enable Foreign Keys
        db.run("PRAGMA foreign_keys = ON");

        // Create Conversations Table
        db.run(`CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT DEFAULT 'New Chat',
            system_prompt TEXT DEFAULT 'You are a helpful assistant.',
            model TEXT DEFAULT 'gpt-5-nano',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )`);

        // Migration to add last_response_id if missing
        db.all("PRAGMA table_info(conversations)", (err, rows) => {
            if (err) {
                console.error("Error checking table info:", err);
                return;
            }
            const hasColumn = rows.some(row => row.name === 'last_response_id');
            if (!hasColumn) {
                db.run("ALTER TABLE conversations ADD COLUMN last_response_id TEXT", (err) => {
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

// Helper to run query returning Promise (for inserts/updates)
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
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

// Helper to get single row
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
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
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
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

module.exports = { connect, run, get, all };
