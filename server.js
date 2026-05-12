import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'spadesk-secret-key-change-in-production'

app.use(cors())
app.use(express.json())

const db = new Database('spadesk.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    customerName TEXT,
    amount REAL NOT NULL,
    description TEXT,
    paymentMethod TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`)

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' })
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(400).json({ error: 'Email already registered' })
    
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword)
    
    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: result.lastInsertRowid, name, email } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, createdAt FROM users WHERE id = ?').get(req.userId)
  res.json(user)
})

app.post('/api/sales', authenticate, (req, res) => {
  const { customerName, amount, description, paymentMethod } = req.body
  const result = db.prepare('INSERT INTO sales (userId, customerName, amount, description, paymentMethod) VALUES (?, ?, ?, ?, ?)').run(req.userId, customerName, amount, description, paymentMethod)
  res.json({ id: result.lastInsertRowid, userId: req.userId, customerName, amount, description, paymentMethod, createdAt: new Date().toISOString() })
})

app.get('/api/sales', authenticate, (req, res) => {
  const sales = db.prepare('SELECT * FROM sales WHERE userId = ? ORDER BY createdAt DESC').all(req.userId)
  res.json(sales)
})

app.delete('/api/sales/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM sales WHERE id = ? AND userId = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

app.post('/api/expenses', authenticate, (req, res) => {
  const { category, amount, description } = req.body
  const result = db.prepare('INSERT INTO expenses (userId, category, amount, description) VALUES (?, ?, ?, ?)').run(req.userId, category, amount, description)
  res.json({ id: result.lastInsertRowid, userId: req.userId, category, amount, description, createdAt: new Date().toISOString() })
})

app.get('/api/expenses', authenticate, (req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses WHERE userId = ? ORDER BY createdAt DESC').all(req.userId)
  res.json(expenses)
})

app.delete('/api/expenses/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ? AND userId = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

app.post('/api/customers', authenticate, (req, res) => {
  const { name, email, phone, address } = req.body
  const result = db.prepare('INSERT INTO customers (userId, name, email, phone, address) VALUES (?, ?, ?, ?, ?)').run(req.userId, name, email, phone, address)
  res.json({ id: result.lastInsertRowid, userId: req.userId, name, email, phone, address, createdAt: new Date().toISOString() })
})

app.get('/api/customers', authenticate, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers WHERE userId = ? ORDER BY createdAt DESC').all(req.userId)
  res.json(customers)
})

app.delete('/api/customers/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ? AND userId = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`SpaDesk API running on port ${PORT}`)
})