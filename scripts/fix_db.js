const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

const appName = 'GERAI'; // Based on productName
const dbName = 'gerai.db';

// Try typical Electron userData paths
const candidates = [
    path.join(os.homedir(), 'Library', 'Application Support', appName, dbName),
    path.join(os.homedir(), 'Library', 'Application Support', 'gerai', dbName),
    path.join(os.homedir(), 'AppData', 'Roaming', appName, dbName),
    path.join(os.homedir(), 'AppData', 'Roaming', 'gerai', dbName),
    path.resolve(__dirname, '../gerai.db')
];

let targetDb = null;
for (const p of candidates) {
    if (fs.existsSync(p)) {
        targetDb = p;
        break;
    }
}

if (!targetDb) {
    console.log("Could not find DB in standard locations for OS:", process.platform);
    process.exit(1);
}

console.log("Checking DB at:", targetDb);

const db = new sqlite3.Database(targetDb);
db.all("PRAGMA table_info(conversations)", (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Columns:", rows.map(r => r.name));
    const hasCol = rows.some(r => r.name === 'last_response_id');
    console.log("Has last_response_id:", hasCol);
    if (!hasCol) {
        console.log("Adding column...");
        db.run("ALTER TABLE conversations ADD COLUMN last_response_id TEXT", (err) => {
            if (err) console.error(err);
            else console.log("Success: Added last_response_id column.");
        });
    } else {
        console.log("Column already exists.");
    }
});
