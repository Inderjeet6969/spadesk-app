import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom'
import { TrendingUp, Receipt, Users, Camera, Database, Download, LogOut, Plus, X, Search, Trash2, FileText, Calendar, DollarSign, TrendingDown, ArrowUp, ArrowDown, PieChart, BarChart3 } from 'lucide-react'
import './index.css'

const DB_KEY = 'spaDeskDB'

const initialDB = {
  users: [],
  currentUser: null,
  sales: [],
  expenses: [],
  customers: []
}

const loadDB = () => {
  const stored = localStorage.getItem(DB_KEY)
  return stored ? JSON.parse(stored) : initialDB
}

const saveDB = (data) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data))
}

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const db = loadDB()
    
    if (!email || !password || (!isRegister && !name)) {
      setError('Please fill all fields')
      return
    }

    if (isRegister) {
      const exists = db.users.find(u => u.email === email)
      if (exists) {
        setError('Email already registered')
        return
      }
      const newUser = { id: Date.now().toString(), name, email, password, createdAt: new Date().toISOString() }
      db.users.push(newUser)
      db.currentUser = newUser
      saveDB(db)
      onLogin(newUser)
      navigate('/home')
    } else {
      const user = db.users.find(u => u.email === email && u.password === password)
      if (!user) {
        setError('Invalid credentials')
        return
      }
      db.currentUser = user
      saveDB(db)
      onLogin(user)
      navigate('/home')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>SpaDesk</h1>
          <p>Manage your spa business efficiently</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>}
          <button type="submit" className="btn btn-primary">{isRegister ? 'Create Account' : 'Login'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have account? Login' : "Don't have account? Register"}
          </button>
        </form>
      </div>
    </div>
  )
}

function TabBar({ current }) {
  return (
    <nav className="tab-bar">
      <Link to="/home" className={`tab-item ${current === 'home' ? 'active' : ''}`}>
        <TrendingUp size={22} />
        Home
      </Link>
      <Link to="/database" className={`tab-item ${current === 'database' ? 'active' : ''}`}>
        <Database size={22} />
        Database
      </Link>
      <Link to="/download" className={`tab-item ${current === 'download' ? 'active' : ''}`}>
        <Download size={22} />
        Download
      </Link>
    </nav>
  )
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])
  return <div className="success-toast">{message}</div>
}

function Home({ user, onLogout }) {
  const [showModal, setShowModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [db, setDb] = useState(loadDB)

  const userSales = db.sales.filter(s => s.userId === user.id)
  const userExpenses = db.expenses.filter(e => e.userId === user.id)
  const userCustomers = db.customers.filter(c => c.userId === user.id)

  const totalSales = userSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const totalExpenses = userExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const profit = totalSales - totalExpenses

  const now = new Date()
  const thisMonth = userSales.filter(s => new Date(s.createdAt).getMonth() === now.getMonth() && new Date(s.createdAt).getFullYear() === now.getFullYear())
  const thisMonthSales = thisMonth.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const thisMonthExpenses = userExpenses.filter(e => new Date(e.createdAt).getMonth() === now.getMonth() && new Date(e.createdAt).getFullYear() === now.getFullYear())
  const mtdExpenses = thisMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const mtdProfit = thisMonthSales - mtdExpenses

  const showToast = (msg) => setToast(msg)

  const refreshDB = () => {
    setDb(loadDB())
  }

  const handleSave = (type, data) => {
    const currentDB = loadDB()
    if (type === 'sale') currentDB.sales.push({ ...data, id: Date.now().toString(), userId: user.id, createdAt: new Date().toISOString() })
    if (type === 'expense') currentDB.expenses.push({ ...data, id: Date.now().toString(), userId: user.id, createdAt: new Date().toISOString() })
    if (type === 'customer') currentDB.customers.push({ ...data, id: Date.now().toString(), userId: user.id, createdAt: new Date().toISOString() })
    saveDB(currentDB)
    refreshDB()
    setShowModal(null)
    showToast(`${type === 'sale' ? 'Sale' : type === 'expense' ? 'Expense' : 'Customer'} saved!`)
  }

  return (
    <div className="app">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <main className="main-content">
        <header className="header">
          <div>
            <h2>Hi, {user.name}!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Welcome to SpaDesk</p>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={16} style={{ marginRight: 4 }} />
            Logout
          </button>
        </header>

        <div className="welcome-card">
          <h3>SpaDesk</h3>
          <p>Track sales, expenses & customers</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card sales">
            <div className="stat-value">₹{totalSales.toLocaleString()}</div>
            <div className="stat-label">Total Sales</div>
          </div>
          <div className="stat-card expense">
            <div className="stat-value">₹{totalExpenses.toLocaleString()}</div>
            <div className="stat-label">Expenses</div>
          </div>
          <div className="stat-card customer">
            <div className="stat-value">{userCustomers.length}</div>
            <div className="stat-label">Customers</div>
          </div>
        </div>

        <div className="stats-grid" style={{ marginTop: '8px' }}>
          <div className="stat-card sales">
            <div className="stat-value" style={{ fontSize: '18px' }}>₹{mtdProfit.toLocaleString()}</div>
            <div className="stat-label">MTD Profit</div>
          </div>
          <div className="stat-card expense">
            <div className="stat-value" style={{ fontSize: '18px' }}>₹{thisMonthSales.toLocaleString()}</div>
            <div className="stat-label">MTD Sales</div>
          </div>
          <div className="stat-card customer">
            <div className="stat-value" style={{ fontSize: '18px' }}>₹{mtdExpenses.toLocaleString()}</div>
            <div className="stat-label">MTD Expenses</div>
          </div>
        </div>

        <h3 className="section-title" style={{ marginTop: '24px' }}><TrendingUp size={20} /> Quick Actions</h3>
        <div className="quick-actions">
          <div className="action-card sales" onClick={() => setShowModal('sale')}>
            <div className="action-icon"><TrendingUp size={28} /></div>
            <h4>Add Sale</h4>
            <p>Record new sale</p>
          </div>
          <div className="action-card expense" onClick={() => setShowModal('expense')}>
            <div className="action-icon"><Receipt size={28} /></div>
            <h4>Add Expense</h4>
            <p>Track expenses</p>
          </div>
          <div className="action-card customer" onClick={() => setShowModal('customer')}>
            <div className="action-icon"><Users size={28} /></div>
            <h4>Customer</h4>
            <p>Add new customer</p>
          </div>
          <div className="action-card capture" onClick={() => setShowModal('capture')}>
            <div className="action-icon"><Camera size={28} /></div>
            <h4>Quick Entry</h4>
            <p>Quick capture</p>
          </div>
        </div>
      </main>

      {showModal && (
        <Modal type={showModal} onClose={() => setShowModal(null)} onSave={handleSave} user={user} />
      )}

      <TabBar current="home" />
    </div>
  )
}

function DatabaseView({ user }) {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')
  const [dateFilter, setDateFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [db, setDb] = useState(loadDB)
  const [selectedPeriod, setSelectedPeriod] = useState('all')

  const userSales = db.sales.filter(s => s.userId === user.id)
  const userExpenses = db.expenses.filter(e => e.userId === user.id)
  const userCustomers = db.customers.filter(c => c.userId === user.id)

  const totalSales = userSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const totalExpenses = userExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const profit = totalSales - totalExpenses

  const getFilteredData = (data, dateField = 'createdAt') => {
    const now = new Date()
    let filtered = [...data]
    
    switch (selectedPeriod) {
      case 'today':
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField])
          return itemDate.toDateString() === now.toDateString()
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(item => new Date(item[dateField]) >= weekAgo)
        break
      case 'month':
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField])
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
        })
        break
      case 'year':
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField])
          return itemDate.getFullYear() === now.getFullYear()
        })
        break
    }
    return filtered
  }

  const filteredSales = getFilteredData(userSales)
  const filteredExpenses = getFilteredData(userExpenses)
  const periodSales = filteredSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const periodExpenses = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const periodProfit = periodSales - periodExpenses

  const refreshDB = () => setDb(loadDB())

  const deleteItem = (type, id) => {
    const currentDB = loadDB()
    if (type === 'sale') currentDB.sales = currentDB.sales.filter(s => s.id !== id)
    if (type === 'expense') currentDB.expenses = currentDB.expenses.filter(e => e.id !== id)
    if (type === 'customer') currentDB.customers = currentDB.customers.filter(c => c.id !== id)
    saveDB(currentDB)
    refreshDB()
  }

  const expenseByCategory = userExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0)
    return acc
  }, {})

  const topCustomers = userSales.reduce((acc, s) => {
    const name = s.customerName || 'Walk-in'
    acc[name] = (acc[name] || 0) + parseFloat(s.amount || 0)
    return acc
  }, {})

  return (
    <div className="app">
      <main className="main-content">
        <header className="header">
          <h2>Database</h2>
        </header>

        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Sales</button>
          <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>Expenses</button>
          <button className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>Customers</button>
        </div>

        <div className="search-bar">
          <select className="select-input" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={{ marginBottom: '12px' }}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="stats-grid">
              <div className="stat-card sales">
                <div className="stat-value">₹{periodSales.toLocaleString()}</div>
                <div className="stat-label">Period Sales</div>
              </div>
              <div className="stat-card expense">
                <div className="stat-value">₹{periodExpenses.toLocaleString()}</div>
                <div className="stat-label">Period Expenses</div>
              </div>
              <div className="stat-card customer">
                <div className="stat-value" style={{ color: periodProfit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>₹{periodProfit.toLocaleString()}</div>
                <div className="stat-label">Period Profit</div>
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: '20px' }}><PieChart size={18} /> Expense by Category</h3>
            <div className="data-list">
              {Object.entries(expenseByCategory).length === 0 ? (
                <div className="empty-state"><PieChart size={48} /><p>No expenses recorded</p></div>
              ) : (
                Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat} className="data-item">
                    <div className="data-item-info">
                      <h4>{cat}</h4>
                    </div>
                    <div className="data-item-amount">
                      <div className="amount expense">₹{amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <h3 className="section-title" style={{ marginTop: '20px' }}><TrendingUp size={18} /> Top Customers</h3>
            <div className="data-list">
              {Object.entries(topCustomers).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => (
                <div key={name} className="data-item">
                  <div className="data-item-info">
                    <h4>{name}</h4>
                  </div>
                  <div className="data-item-amount">
                    <div className="amount">₹{amount.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'sales' && (
          <div className="data-list">
            {filteredSales.length === 0 ? (
              <div className="empty-state"><TrendingUp size={48} /><p>No sales found</p></div>
            ) : (
              filteredSales.map(sale => (
                <div key={sale.id} className="data-item">
                  <div className="data-item-info">
                    <h4>{sale.customerName || 'Walk-in'}</h4>
                    <p>{sale.description || 'Sale'} - {sale.paymentMethod}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(sale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="data-item-amount">
                      <div className="amount">₹{parseFloat(sale.amount).toLocaleString()}</div>
                    </div>
                    <button className="delete-btn" onClick={() => deleteItem('sale', sale.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="data-list">
            {filteredExpenses.length === 0 ? (
              <div className="empty-state"><Receipt size={48} /><p>No expenses found</p></div>
            ) : (
              filteredExpenses.map(exp => (
                <div key={exp.id} className="data-item">
                  <div className="data-item-info">
                    <h4>{exp.category}</h4>
                    <p>{exp.description}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(exp.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="data-item-amount">
                      <div className="amount expense">-₹{parseFloat(exp.amount).toLocaleString()}</div>
                    </div>
                    <button className="delete-btn" onClick={() => deleteItem('expense', exp.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="data-list">
            {userCustomers.length === 0 ? (
              <div className="empty-state"><Users size={48} /><p>No customers found</p></div>
            ) : (
              userCustomers.map(cust => (
                <div key={cust.id} className="data-item">
                  <div className="data-item-info">
                    <h4>{cust.name}</h4>
                    <p>{cust.email}</p>
                    <p>{cust.phone}</p>
                  </div>
                  <button className="delete-btn" onClick={() => deleteItem('customer', cust.id)}><Trash2 size={16} /></button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <TabBar current="database" />
    </div>
  )
}

function DownloadView({ user }) {
  const [db] = useState(loadDB)
  const [dateRange, setDateRange] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  const userSales = db.sales.filter(s => s.userId === user.id)
  const userExpenses = db.expenses.filter(e => e.userId === user.id)
  const userCustomers = db.customers.filter(c => c.userId === user.id)

  const getFilteredData = (data, dateField = 'createdAt') => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return data.filter(item => new Date(item[dateField]).toDateString() === now.toDateString())
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return data.filter(item => new Date(item[dateField]) >= weekAgo)
      case 'month':
        return data.filter(item => {
          const d = new Date(item[dateField])
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
      case 'year':
        return data.filter(item => new Date(item[dateField]).getFullYear() === now.getFullYear())
      default:
        return data
    }
  }

  const filteredSales = getFilteredData(userSales)
  const filteredExpenses = getFilteredData(userExpenses)

  const generateReport = (type) => {
    const date = new Date().toLocaleDateString()
    let content = ''
    const periodName = dateRange === 'all' ? 'All Time' : dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'This Year'

    if (type === 'all' || type === 'sales') {
      content += `SPA DESK - SALES REPORT\nPeriod: ${periodName} | Generated: ${date}\nUser: ${user.name}\n\n`
      content += `=== SALES (${filteredSales.length} records) ===\n`
      content += `Total Sales: ₹${filteredSales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0).toLocaleString()}\n\n`
      filteredSales.forEach(s => {
        content += `Date: ${new Date(s.createdAt).toLocaleDateString()} | Customer: ${s.customerName || 'Walk-in'} | Amount: ₹${parseFloat(s.amount).toLocaleString()} | Payment: ${s.paymentMethod} | ${s.description || ''}\n`
      })
    }

    if (type === 'all' || type === 'expenses') {
      content += `\n\n=== EXPENSES (${filteredExpenses.length} records) ===\n`
      content += `Total Expenses: ₹${filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0).toLocaleString()}\n\n`
      filteredExpenses.forEach(e => {
        content += `Date: ${new Date(e.createdAt).toLocaleDateString()} | Category: ${e.category} | Amount: ₹${parseFloat(e.amount).toLocaleString()} | ${e.description}\n`
      })
    }

    if (type === 'all' || type === 'customers') {
      content += `\n\n=== CUSTOMERS (${userCustomers.length} records) ===\n`
      userCustomers.forEach(c => {
        content += `Name: ${c.name} | Email: ${c.email} | Phone: ${c.phone} | Address: ${c.address || 'N/A'}\n`
      })
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spadesk_${type}_${dateRange}_${date.replace(/\//g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCSV = (type) => {
    let csv = ''
    
    if (type === 'sales') {
      csv = 'Date,Customer,Amount,Payment Method,Description\n'
      filteredSales.forEach(s => {
        csv += `${new Date(s.createdAt).toLocaleDateString()},${s.customerName || 'Walk-in'},${s.amount},${s.paymentMethod},${s.description || ''}\n`
      })
    } else if (type === 'expenses') {
      csv = 'Date,Category,Amount,Description\n'
      filteredExpenses.forEach(e => {
        csv += `${new Date(e.createdAt).toLocaleDateString()},${e.category},${e.amount},${e.description}\n`
      })
    } else if (type === 'customers') {
      csv = 'Name,Email,Phone,Address\n'
      userCustomers.forEach(c => {
        csv += `${c.name},${c.email},${c.phone},${c.address || ''}\n`
      })
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spadesk_${type}_${dateRange}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <main className="main-content">
        <header className="header">
          <h2>Download Reports</h2>
        </header>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Select Date Range</label>
          <select className="select-input" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <div className="download-section">
          <h3 className="section-title"><FileText size={20} /> Complete Report</h3>
          <div className="download-card" onClick={() => generateReport('all')}>
            <div className="download-icon"><FileText size={24} /></div>
            <div className="download-info">
              <h4>Full Report (Text)</h4>
              <p>All sales, expenses & customers</p>
            </div>
          </div>
          <div className="download-card" onClick={() => downloadCSV('sales') + downloadCSV('expenses') + downloadCSV('customers')}>
            <div className="download-icon"><BarChart3 size={24} /></div>
            <div className="download-info">
              <h4>All Data (CSV)</h4>
              <p>Multiple CSV files</p>
            </div>
          </div>
        </div>

        <div className="download-section">
          <h3 className="section-title"><TrendingUp size={20} /> Sales Reports</h3>
          <div className="download-card" onClick={() => generateReport('sales')}>
            <div className="download-icon"><FileText size={24} /></div>
            <div className="download-info">
              <h4>Sales Report (Text)</h4>
              <p>{filteredSales.length} sales in selected period</p>
            </div>
          </div>
          <div className="download-card" onClick={() => downloadCSV('sales')}>
            <div className="download-icon"><Download size={24} /></div>
            <div className="download-info">
              <h4>Sales Data (CSV)</h4>
              <p>For Excel & Google Sheets</p>
            </div>
          </div>
        </div>

        <div className="download-section">
          <h3 className="section-title"><Receipt size={20} /> Expense Reports</h3>
          <div className="download-card" onClick={() => generateReport('expenses')}>
            <div className="download-icon"><FileText size={24} /></div>
            <div className="download-info">
              <h4>Expense Report (Text)</h4>
              <p>{filteredExpenses.length} expenses in selected period</p>
            </div>
          </div>
          <div className="download-card" onClick={() => downloadCSV('expenses')}>
            <div className="download-icon"><Download size={24} /></div>
            <div className="download-info">
              <h4>Expense Data (CSV)</h4>
              <p>For Excel & Google Sheets</p>
            </div>
          </div>
        </div>

        <div className="download-section">
          <h3 className="section-title"><Users size={20} /> Customer Reports</h3>
          <div className="download-card" onClick={() => generateReport('customers')}>
            <div className="download-icon"><FileText size={24} /></div>
            <div className="download-info">
              <h4>Customer List (Text)</h4>
              <p>{userCustomers.length} total customers</p>
            </div>
          </div>
          <div className="download-card" onClick={() => downloadCSV('customers')}>
            <div className="download-icon"><Download size={24} /></div>
            <div className="download-info">
              <h4>Customer Data (CSV)</h4>
              <p>For Excel & Google Sheets</p>
            </div>
          </div>
        </div>
      </main>

      <TabBar current="download" />
    </div>
  )
}

function Modal({ type, onClose, onSave }) {
  const [formData, setFormData] = useState({
    customerName: '',
    amount: '',
    description: '',
    category: 'Utilities',
    paymentMethod: 'Cash',
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (type === 'sale' && !formData.amount) return
    if (type === 'expense' && (!formData.amount || !formData.category)) return
    if (type === 'customer' && (!formData.name || !formData.email)) return
    onSave(type, formData)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>
            {type === 'sale' && 'Add New Sale'}
            {type === 'expense' && 'Add Expense'}
            {type === 'customer' && 'Add Customer'}
            {type === 'capture' && 'Quick Entry'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {(type === 'sale' || type === 'capture') && (
            <>
              <div className="form-group">
                <label>Customer Name (Optional)</label>
                <input type="text" placeholder="Walk-in customer" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" placeholder="Enter amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="What was sold?" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select className="select-input" value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                 <option>Bank Transfer</option>
                </select>
              </div>
            </>
          )}

          {type === 'expense' && (
            <>
              <div className="form-group">
                <label>Category</label>
                <select className="select-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option>Utilities</option>
                  <option>Rent</option>
                  <option>Supplies</option>
                  <option>Salaries</option>
                  <option>Marketing</option>
                  <option>Travel</option>
                  <option>Equipment</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" placeholder="Enter amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea placeholder="Expense details" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
              </div>
            </>
          )}

          {type === 'customer' && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Customer name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="customer@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Address (Optional)</label>
                <textarea placeholder="Customer address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}></textarea>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
            Save {type === 'sale' ? 'Sale' : type === 'expense' ? 'Expense' : type === 'customer' ? 'Customer' : 'Entry'}
          </button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const db = loadDB()
    if (db.currentUser) setUser(db.currentUser)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    const db = loadDB()
    db.currentUser = null
    saveDB(db)
    setUser(null)
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Home user={user} onLogout={handleLogout} />} />
        <Route path="/database" element={<DatabaseView user={user} />} />
        <Route path="/download" element={<DownloadView user={user} />} />
        <Route path="/*" element={<Navigate to="/home" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App