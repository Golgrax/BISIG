import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;
const db = new Database('db.sqlite');

app.use(cors());
app.use(bodyParser.json());

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    is_admin BOOLEAN DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mode TEXT,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    word TEXT,
    is_real BOOLEAN DEFAULT 1,
    feedback TEXT,
    status TEXT DEFAULT 'PENDING',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Ensure Status column exists
try { db.prepare('SELECT status FROM verifications LIMIT 1').get(); } catch (e) { db.exec("ALTER TABLE verifications ADD COLUMN status TEXT DEFAULT 'PENDING'"); }

// Auth Routes
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const info = db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)').run(username, hashedPassword, username.includes('admin') ? 1 : 0);
    res.json({ success: true, userId: info.lastInsertRowid });
  } catch (err) { res.status(400).json({ success: false, message: 'User exists' }); }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (user && await bcrypt.compare(password, user.password)) {
    res.json({ success: true, userId: user.id, username: user.username, isAdmin: !!user.is_admin });
  } else { res.status(401).json({ success: false, message: 'Invalid credentials' }); }
});

// Stats
app.get('/api/user-stats/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const historyCount = db.prepare('SELECT COUNT(*) as count FROM history WHERE user_id = ?').get(userId).count;
    const verifyCount = db.prepare('SELECT COUNT(*) as count FROM verifications WHERE user_id = ?').get(userId).count;
    const feedbacks = db.prepare('SELECT * FROM verifications WHERE user_id = ? ORDER BY timestamp DESC').all(userId);
    res.json({ success: true, points: (historyCount * 10) + (verifyCount * 50), streak: 1, donations: verifyCount, rank: "#1", level: 1, feedbacks });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Verify
app.post('/api/verify', (req, res) => {
    const { userId, word, isReal, feedback } = req.body;
    db.prepare('INSERT INTO verifications (user_id, word, is_real, feedback, status) VALUES (?, ?, ?, ?, ?)').run(userId, word, isReal ? 1 : 0, feedback, 'PENDING');
    res.json({ success: true });
});

// Admin Approve/Reject
app.post('/api/admin/action', (req, res) => {
    const { id, word, action } = req.body;
    const filePath = path.join(__dirname, '../src/data/verified_signs.json');
    try {
        if (action === 'APPROVE') {
            db.prepare('UPDATE verifications SET status = ? WHERE id = ?').run('APPROVED', id);
            let verified = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!verified.includes(word)) {
                verified.push(word);
                fs.writeFileSync(filePath, JSON.stringify(verified, null, 2));
            }
        } else {
            db.prepare('UPDATE verifications SET status = ? WHERE id = ?').run('REJECTED', id);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/admin/feedbacks', (req, res) => {
    const data = db.prepare(`
        SELECT v.*, u.username 
        FROM verifications v 
        JOIN users u ON v.user_id = u.id 
        WHERE v.status = 'PENDING'
        ORDER BY v.timestamp DESC
    `).all();
    res.json(data);
});

// History
app.post('/api/history', (req, res) => {
  const { userId, mode, text } = req.body;
  const cleanText = text.trim();
  // Case-insensitive delete: remove any existing entry for this word/mode
  db.prepare('DELETE FROM history WHERE user_id = ? AND mode = ? AND LOWER(TRIM(text)) = LOWER(?)').run(userId, mode, cleanText);
  db.prepare('INSERT INTO history (user_id, mode, text) VALUES (?, ?, ?)').run(userId, mode, cleanText);
  res.json({ success: true });
});

app.get('/api/history/:userId', (req, res) => {
  // Use GROUP BY with LOWER/TRIM to ensure absolute uniqueness across existing data
  res.json(db.prepare(`
    SELECT * FROM history 
    WHERE user_id = ? 
    AND id IN (SELECT MAX(id) FROM history WHERE user_id = ? GROUP BY mode, LOWER(TRIM(text)))
    ORDER BY id DESC
  `).all(req.params.userId, req.params.userId));
});

app.get('/api/interpreters', (req, res) => { try { res.json(JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/interpreters.json'), 'utf8'))); } catch(e) { res.json([]); } });
app.get('/api/establishments', (req, res) => { try { res.json(JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/establishments.json'), 'utf8'))); } catch(e) { res.json([]); } });

app.listen(port, () => { console.log(`Server running at http://localhost:${port}`); });
