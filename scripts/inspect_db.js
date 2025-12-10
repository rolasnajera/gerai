const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

const appName = 'GERAI';
const dbName = 'gerai.db';
const candidate = path.join(os.homedir(), 'Library', 'Application Support', appName, dbName);

if (!fs.existsSync(candidate)) {
    console.log("DB not found at", candidate);
    process.exit(1);
}

const db = new sqlite3.Database(candidate);
db.all("SELECT id, title, last_response_id FROM conversations", (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});
