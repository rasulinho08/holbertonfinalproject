#!/usr/bin/env node
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
// Allow CORS from the web build origin so the static site can call the mock API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const DATA_DIR = path.join(__dirname, '..', 'backend-guide', 'seed-data');
function load(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name + '.json'), 'utf8'));
}

const books = load('books');
const quotes = load('quotes');
const users = load('users');

// Simple in-memory cart and shelves per demo user
const CART = { items: [] };
const SHELVES = [
  { id: 's_reading', title: 'Oxuyuram' },
  { id: 's_want', title: 'Oxumaq istəyirəm' },
];

app.post('/api/v1/auth/login', (req, res) => {
  const { email } = req.body || {};
  // Accept any credentials for demo — return AuthSession shape
  const user = users.find((u) => u.email === email) || users[0] || { id: 'u_demo', username: 'leyla' };
  res.json({ accessToken: 'demo-access-token', refreshToken: 'demo-refresh-token', user });
});

app.get('/api/v1/genres', (req, res) => {
  // Return some common genres (slugs) — UI maps to localized labels
  res.json([
    { id: 'novel', name: 'novel' },
    { id: 'detektiv', name: 'detektiv' },
    { id: 'klassik', name: 'klassik' },
  ]);
});

app.get('/api/v1/books', (req, res) => {
  res.json({ items: books.slice(0, 50), total: books.length });
});

app.get('/api/v1/books/trending', (req, res) => {
  res.json({ items: books.slice(0, 12) });
});

app.get('/api/v1/books/recommendations', (req, res) => {
  res.json({ items: books.slice(0, 12) });
});

app.get('/api/v1/books/:id', (req, res) => {
  const b = books.find((x) => x.id === req.params.id || x.title === req.params.id);
  if (!b) return res.status(404).json({ error: 'not found' });
  res.json(b);
});

app.get('/api/v1/search/suggest', (req, res) => {
  const q = (req.query.q || req.query.query || '').toLowerCase();
  const found = books.filter((b) => b.title.toLowerCase().includes(q) || (b.authorName || '').toLowerCase().includes(q));
  res.json({ items: found.slice(0, 20) });
});

app.post('/api/v1/books/:bookId/shelf', (req, res) => {
  // pretend to move/set shelf
  res.json({ ok: true, message: 'rəfinə əlavə olundu' });
});

app.get('/api/v1/shelves', (req, res) => res.json({ items: SHELVES }));

app.get('/api/v1/feed', (req, res) => res.json({ items: [] }));

app.get('/api/v1/notifications', (req, res) => res.json({ items: [] }));

app.get('/api/v1/streak', (req, res) => res.json({ currentStreak: 5, longest: 10 }));

app.post('/api/v1/cart/items', (req, res) => {
  const item = req.body;
  CART.items.push(item);
  res.json({ ok: true });
});
app.get('/api/v1/cart', (req, res) => res.json(CART));

app.post('/api/v1/orders', (req, res) => {
  res.json({ id: 'ord_demo', status: 'placed' });
});

app.get('/api/v1/quotes', (req, res) => res.json({ items: quotes.slice(0, 20) }));
app.get('/api/v1/gamification/leaderboard', (req, res) => {
  res.json({ items: [{ username: 'leyla', score: 100 }, { username: 'ali', score: 90 }] });
});

// Some clients call /leaderboard directly
app.get('/api/v1/leaderboard', (req, res) => res.json({ items: [{ username: 'leyla', score: 100 }, { username: 'ali', score: 90 }] }));

app.get('/api/v1/users/:username/stats', (req, res) => {
  res.json({ booksRead: 12, pagesRead: 3456, genres: [] });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log('Mock backend listening on http://localhost:' + port + '/api/v1');
});
