import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    password TEXT
  );
  
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mode TEXT,
    text TEXT,
    time TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE,
    category TEXT,
    videoUrl TEXT
  );
`);

// Seed dictionary if empty
const count = db.prepare('SELECT COUNT(*) as count FROM dictionary').get().count;
if (count === 0) {
  try {
    const jsonPath = path.join(__dirname, '../src/data/dictionary.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const insert = db.prepare('INSERT INTO dictionary (word, category, videoUrl) VALUES (?, ?, ?)');
    for (const item of data) {
      insert.run(item.word, item.category, item.videoUrl);
    }
    console.log('Dictionary seeded from JSON');
  } catch (err) {
    console.error('Error seeding dictionary:', err.message);
  }
}

// Auth Routes
/* ... existing routes ... */
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  try {
    const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, password);
    res.json({ success: true, userId: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Username already exists' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (user) {
    res.json({ success: true, userId: user.id, username: user.username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// History Routes
app.post('/api/history', (req, res) => {
  const { userId, mode, text, time } = req.body;
  db.prepare('INSERT INTO history (user_id, mode, text, time) VALUES (?, ?, ?, ?)').run(userId, mode, text, time);
  res.json({ success: true });
});

app.get('/api/history/:userId', (req, res) => {
  const history = db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY id DESC').all(req.params.userId);
  res.json(history);
});

// Dictionary Routes
app.get('/api/dictionary', (req, res) => {
  const words = db.prepare('SELECT * FROM dictionary ORDER BY word ASC').all();
  res.json(words);
});

app.post('/api/dictionary', (req, res) => {
  const { word, category, videoUrl } = req.body;
  try {
    const info = db.prepare('INSERT INTO dictionary (word, category, videoUrl) VALUES (?, ?, ?)').run(word, category, videoUrl);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Word already exists' });
  }
});

app.delete('/api/dictionary/:id', (req, res) => {
  db.prepare('DELETE FROM dictionary WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
