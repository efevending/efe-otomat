import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/otomat.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!dbDir.startsWith('/') || !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`Veritabanı yolu: ${DB_PATH}`);
console.log(`DATABASE_PATH env: ${process.env.DATABASE_PATH || '(ayarlanmamış)'}`);

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

process.on('exit', () => db.close());
process.on('SIGINT', () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });

export default db;
