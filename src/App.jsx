import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom'
import { TrendingUp, Receipt, Users, Camera, Database, Download, LogOut, Plus, X, Search, Trash2, FileText, PieChart, BarChart3 } from 'lucide-react'
import './index.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const body = isRegister ? { name, email, password } : { email, password }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      
      localStorage.setItem('spadesk_token', data.token)
      localStorage.setItem('spadesk_user', JSON.stringify(data.user))
      onLogin(data.user)
      navigate('/home')
    } catch (err) {
      setError('Server error. Please try again.')
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
      <Link to="/home" className={`tab-item ${current === 'home' ? 'active' : ''}`}><TrendingUp size={22} />Home</Link>
      <Link to="/database" className={`tab-item ${current === 'database' ? 'active' : ''}`}><Database size={22} />Database</Link>
      <Link to="/download" className={`tab-item ${current === 'download' ? 'active' : ''}`}><Download size={22} />Download</Link>
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

function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('spadesk_token')
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  })
}

function Home({ user, onLogout }) {
  const [showModal, setShowModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [customers, setCustomers] = useState([])

  const loadData = async () => {
    try {
      const [salesRes, expensesRes, customersRes] = await Promise.all([
        apiFetch('/sales'),
        apiFetch('/expenses'),
        apiFetch('/customers')
      ])
      if (salesRes.ok) setSales(await salesRes.json())
      if (expensesRes.ok) setExpenses(await expensesRes.json())
      if (customersRes.ok) setCustomers(await customersRes.json())
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadData() }, [])

  const totalSales = sales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const profit = totalSales - totalExpenses

  const now = new Date()
  const mtdSales = sales.filter(s => { const d = new Date(s.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const mtdExpenses = expenses.filter(e => { const d = new Date(e.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const mtdProfit = mtdSales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0) - mtdExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  const showToast = (msg) => setToast(msg)

  const handleSave = async (type, data) => {
    try {
      const endpoint = type === 'sale' ? '/sales' : type === 'expense' ? '/expenses' : '/customers'
      const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) })
      if (res.ok) { loadData(); setShowModal(null); showToast(`${type === 'sale' ? 'Sale' : type === 'expense' ? 'Expense' : 'Customer'} saved!`) }
    } catch (e) { console.error(e) }
  }

  return (
    <div className="app">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <main className="main-content">
        <header className="header">
          <div><h2>Hi, {user.name}!</h2><p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Welcome to SpaDesk</p></div>
          <button className="logout-btn" onClick={onLogout}><LogOut size={16} style={{ marginRight: 4 }} />Logout</button>
        </header>
        <div className="welcome-card"><h3>SpaDesk</h3><p>Track sales, expenses & customers</p></div>
        <div className="stats-grid">
          <div className="stat-card sales"><div className="stat-value">₹{totalSales.toLocaleString()}</div><div className="stat-label">Total Sales</div></div>
          <div className="stat-card expense"><div className="stat-value">₹{totalExpenses.toLocaleString()}</div><div className="stat-label">Expenses</div></div>
          <div className="stat-card customer"><div className="stat-value">{customers.length}</div><div className="stat-label">Customers</div></div>
        </div>
        <div className="stats-grid" style={{ marginTop: '8px' }}>
          <div className="stat-card sales"><div className="stat-value" style={{ fontSize: '18px' }}>₹{mtdProfit.toLocaleString()}</div><div className="stat-label">MTD Profit</div></div>
          <div className="stat-card expense"><div className="stat-value" style={{ fontSize: '18px' }}>₹{mtdSales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0).toLocaleString()}</div><div className="stat-label">MTD Sales</div></div>
          <div className="stat-card customer"><div className="stat-value" style={{ fontSize: '18px' }}>₹{mtdExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0).toLocaleString()}</div><div className="stat-label">MTD Expenses</div></div>
        </div>
        <h3 className="section-title" style={{ marginTop: '24px' }}><TrendingUp size={20} /> Quick Actions</h3>
        <div className="quick-actions">
          <div className="action-card sales" onClick={() => setShowModal('sale')}><div className="action-icon"><TrendingUp size={28} /></div><h4>Add Sale</h4><p>Record new sale</p></div>
          <div className="action-card expense" onClick={() => setShowModal('expense')}><div className="action-icon"><Receipt size={28} /></div><h4>Add Expense</h4><p>Track expenses</p></div>
          <div className="action-card customer" onClick={() => setShowModal('customer')}><div className="action-icon"><Users size={28} /></div><h4>Customer</h4><p>Add new customer</p></div>
          <div className="action-card capture" onClick={() => setShowModal('capture')}><div className="action-icon"><Camera size={28} /></div><h4>Quick Entry</h4><p>Quick capture</p></div>
        </div>
      </main>
      {showModal && <Modal type={showModal} onClose={() => setShowModal(null)} onSave={handleSave} />}
      <TabBar current="home" />
    </div>
  )
}

function DatabaseView({ user }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [customers, setCustomers] = useState([])

  const loadData = async () => {
    try {
      const [salesRes, expensesRes, customersRes] = await Promise.all([
        apiFetch('/sales'), apiFetch('/expenses'), apiFetch('/customers')
      ])
      if (salesRes.ok) setSales(await salesRes.json())
      if (expensesRes.ok) setExpenses(await expensesRes.json())
      if (customersRes.ok) setCustomers(await customersRes.json())
    } catch (e) { console.error(e) }
  }
  useEffect(() => { loadData() }, [])

  const getFilteredData = (data, dateField = 'createdAt') => {
    const now = new Date()
    let filtered = [...data]
    if (selectedPeriod === 'today') filtered = filtered.filter(i => new Date(i[dateField]).toDateString() === now.toDateString())
    else if (selectedPeriod === 'week') { const w = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); filtered = filtered.filter(i => new Date(i[dateField]) >= w) }
    else if (selectedPeriod === 'month') filtered = filtered.filter(i => { const d = new Date(i[dateField]); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    else if (selectedPeriod === 'year') filtered = filtered.filter(i => new Date(i[dateField]).getFullYear() === now.getFullYear())
    return filtered
  }

  const filteredSales = getFilteredData(sales)
  const filteredExpenses = getFilteredData(expenses)
  const periodProfit = filteredSales.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0) - filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  const expenseByCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0); return acc }, {})
  const topCustomers = sales.reduce((acc, s) => { const n = s.customerName || 'Walk-in'; acc[n] = (acc[n] || 0) + parseFloat(s.amount || 0); return acc }, {})

  const deleteItem = async (type, id) => {
    try {
      const endpoint = type === 'sale' ? `/sales/${id}` : type === 'expense' ? `/expenses/${id}` : `/customers/${id}`
      await apiFetch(endpoint, { method: 'DELETE' })
      loadData()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="app">
      <main className="main-content">
        <header className="header"><h2>Database</h2></header>
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Sales</button>
          <button className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>Expenses</button>
          <button className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>Customers</button>
        </div>
        <select className="select-input" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={{ marginBottom: '12px' }}>
          <option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="year">This Year</option>
        </select>

        {activeTab === 'overview' && (
          <>
            <div className="stats-grid">
              <div className="stat-card sales"><div className="stat-value">₹{filteredSales.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toLocaleString()}</div><div className="stat-label">Period Sales</div></div>
              <div className="stat-card expense"><div className="stat-value">₹{filteredExpenses.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toLocaleString()}</div><div className="stat-label">Period Expenses</div></div>
              <div className="stat-card customer"><div className="stat-value" style={{ color: periodProfit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>₹{periodProfit.toLocaleString()}</div><div className="stat-label">Period Profit</div></div>
            </div>
            <h3 className="section-title" style={{ marginTop: '20px' }}><PieChart size={18} /> Expense by Category</h3>
            <div className="data-list">
              {Object.entries(expenseByCategory).length === 0 ? <div className="empty-state"><PieChart size={48} /><p>No expenses</p></div> : Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                <div key={cat} className="data-item"><div className="data-item-info"><h4>{cat}</h4></div><div className="data-item-amount"><div className="amount expense">₹{amount.toLocaleString()}</div></div></div>
              ))}
            </div>
            <h3 className="section-title" style={{ marginTop: '20px' }}><TrendingUp size={18} /> Top Customers</h3>
            <div className="data-list">
              {Object.entries(topCustomers).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => (
                <div key={name} className="data-item"><div className="data-item-info"><h4>{name}</h4></div><div className="data-item-amount"><div className="amount">₹{amount.toLocaleString()}</div></div></div>
              ))}
            </div>
          </>
        )}
        {activeTab === 'sales' && <div className="data-list">{filteredSales.length === 0 ? <div className="empty-state"><TrendingUp size={48} /><p>No sales</p></div> : filteredSales.map(sale => (
          <div key={sale.id} className="data-item"><div className="data-item-info"><h4>{sale.customerName || 'Walk-in'}</h4><p>{sale.description} - {sale.paymentMethod}</p><p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(sale.createdAt).toLocaleDateString()}</p></div><div style={{ display: 'flex', alignItems: 'center' }}><div className="data-item-amount"><div className="amount">₹{parseFloat(sale.amount).toLocaleString()}</div></div><button className="delete-btn" onClick={() => deleteItem('sale', sale.id)}><Trash2 size={16} /></button></div></div>
        ))}</div>}
        {activeTab === 'expenses' && <div className="data-list">{filteredExpenses.length === 0 ? <div className="empty-state"><Receipt size={48} /><p>No expenses</p></div> : filteredExpenses.map(exp => (
          <div key={exp.id} className="data-item"><div className="data-item-info"><h4>{exp.category}</h4><p>{exp.description}</p><p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(exp.createdAt).toLocaleDateString()}</p></div><div style={{ display: 'flex', alignItems: 'center' }}><div className="data-item-amount"><div className="amount expense">-₹{parseFloat(exp.amount).toLocaleString()}</div></div><button className="delete-btn" onClick={() => deleteItem('expense', exp.id)}><Trash2 size={16} /></button></div></div>
        ))}</div>}
        {activeTab === 'customers' && <div className="data-list">{customers.length === 0 ? <div className="empty-state"><Users size={48} /><p>No customers</p></div> : customers.map(cust => (
          <div key={cust.id} className="data-item"><div className="data-item-info"><h4>{cust.name}</h4><p>{cust.email}</p><p>{cust.phone}</p></div><button className="delete-btn" onClick={() => deleteItem('customer', cust.id)}><Trash2 size={16} /></button></div>
        ))}</div>}
      </main>
      <TabBar current="database" />
    </div>
  )
}

function DownloadView({ user }) {
  const [dateRange, setDateRange] = useState('all')
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [customers, setCustomers] = useState([])

  const loadData = async () => {
    try {
      const [salesRes, expensesRes, customersRes] = await Promise.all([apiFetch('/sales'), apiFetch('/expenses'), apiFetch('/customers')])
      if (salesRes.ok) setSales(await salesRes.json())
      if (expensesRes.ok) setExpenses(await expensesRes.json())
      if (customersRes.ok) setCustomers(await customersRes.json())
    } catch (e) { console.error(e) }
  }
  useEffect(() => { loadData() }, [])

  const getFilteredData = (data, dateField = 'createdAt') => {
    const now = new Date()
    if (dateRange === 'today') return data.filter(i => new Date(i[dateField]).toDateString() === now.toDateString())
    if (dateRange === 'week') { const w = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); return data.filter(i => new Date(i[dateField]) >= w) }
    if (dateRange === 'month') return data.filter(i => { const d = new Date(i[dateField]); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
    if (dateRange === 'year') return data.filter(i => new Date(i[dateField]).getFullYear() === now.getFullYear())
    return data
  }

  const filteredSales = getFilteredData(sales)
  const filteredExpenses = getFilteredData(expenses)

  const generateReport = (type) => {
    const date = new Date().toLocaleDateString()
    const periodName = { all: 'All Time', today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year' }[dateRange]
    let content = `SPA DESK REPORT\nPeriod: ${periodName} | Date: ${date} | User: ${user.name}\n${'='.repeat(50)}\n`

    if (type === 'all' || type === 'sales') {
      content += `\n=== SALES (${filteredSales.length}) ===\nTotal: ₹${filteredSales.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toLocaleString()}\n`
      filteredSales.forEach(s => { content += `${new Date(s.createdAt).toLocaleDateString()} | ${s.customerName || 'Walk-in'} | ₹${parseFloat(s.amount).toLocaleString()} | ${s.paymentMethod}\n` })
    }
    if (type === 'all' || type === 'expenses') {
      content += `\n=== EXPENSES (${filteredExpenses.length}) ===\nTotal: ₹${filteredExpenses.reduce((s, i) => s + parseFloat(i.amount || 0), 0).toLocaleString()}\n`
      filteredExpenses.forEach(e => { content += `${new Date(e.createdAt).toLocaleDateString()} | ${e.category} | ₹${parseFloat(e.amount).toLocaleString()}\n` })
    }
    if (type === 'all' || type === 'customers') {
      content += `\n=== CUSTOMERS (${customers.length}) ===\n`
      customers.forEach(c => { content += `${c.name} | ${c.email} | ${c.phone}\n` })
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `spadesk_${type}_${dateRange}_${date.replace(/\//g, '-')}.txt`; a.click()
  }

  const downloadCSV = (type) => {
    let csv = type === 'sales' ? 'Date,Customer,Amount,Payment,Description\n' : type === 'expenses' ? 'Date,Category,Amount,Description\n' : 'Name,Email,Phone,Address\n'
    if (type === 'sales') filteredSales.forEach(s => { csv += `${new Date(s.createdAt).toLocaleDateString()},${s.customerName || 'Walk-in'},${s.amount},${s.paymentMethod},${s.description || ''}\n` })
    else if (type === 'expenses') filteredExpenses.forEach(e => { csv += `${new Date(e.createdAt).toLocaleDateString()},${e.category},${e.amount},${e.description}\n` })
    else customers.forEach(c => { csv += `${c.name},${c.email},${c.phone},${c.address || ''}\n` })
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `spadesk_${type}_${dateRange}.csv`; a.click()
  }

  return (
    <div className="app">
      <main className="main-content">
        <header className="header"><h2>Download Reports</h2></header>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Select Date Range</label>
          <select className="select-input" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="year">This Year</option>
          </select>
        </div>
        <div className="download-section">
          <h3 className="section-title"><FileText size={20} /> Complete Report</h3>
          <div className="download-card" onClick={() => generateReport('all')}><div className="download-icon"><FileText size={24} /></div><div className="download-info"><h4>Full Report (Text)</h4><p>All sales, expenses & customers</p></div></div>
          <div className="download-card" onClick={() => { downloadCSV('sales'); downloadCSV('expenses'); downloadCSV('customers') }}><div className="download-icon"><BarChart3 size={24} /></div><div className="download-info"><h4>All Data (CSV)</h4><p>Multiple CSV files</p></div></div>
        </div>
        <div className="download-section">
          <h3 className="section-title"><TrendingUp size={20} /> Sales</h3>
          <div className="download-card" onClick={() => generateReport('sales')}><div className="download-icon"><FileText size={24} /></div><div className="download-info"><h4>Sales Report</h4><p>{filteredSales.length} records</p></div></div>
          <div className="download-card" onClick={() => downloadCSV('sales')}><div className="download-icon"><Download size={24} /></div><div className="download-info"><h4>Sales (CSV)</h4><p>For Excel</p></div></div>
        </div>
        <div className="download-section">
          <h3 className="section-title"><Receipt size={20} /> Expenses</h3>
          <div className="download-card" onClick={() => generateReport('expenses')}><div className="download-icon"><FileText size={24} /></div><div className="download-info"><h4>Expense Report</h4><p>{filteredExpenses.length} records</p></div></div>
          <div className="download-card" onClick={() => downloadCSV('expenses')}><div className="download-icon"><Download size={24} /></div><div className="download-info"><h4>Expense (CSV)</h4><p>For Excel</p></div></div>
        </div>
        <div className="download-section">
          <h3 className="section-title"><Users size={20} /> Customers</h3>
          <div className="download-card" onClick={() => generateReport('customers')}><div className="download-icon"><FileText size={24} /></div><div className="download-info"><h4>Customer List</h4><p>{customers.length} customers</p></div></div>
          <div className="download-card" onClick={() => downloadCSV('customers')}><div className="download-icon"><Download size={24} /></div><div className="download-info"><h4>Customer (CSV)</h4><p>For Excel</p></div></div>
        </div>
      </main>
      <TabBar current="download" />
    </div>
  )
}

function Modal({ type, onClose, onSave }) {
  const [formData, setFormData] = useState({ customerName: '', amount: '', description: '', category: 'Utilities', paymentMethod: 'Cash', name: '', email: '', phone: '', address: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((type === 'sale' || type === 'capture') && !formData.amount) return
    if (type === 'expense' && (!formData.amount || !formData.category)) return
    if (type === 'customer' && (!formData.name || !formData.email)) return
    onSave(type, formData)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h3>{type === 'sale' ? 'Add Sale' : type === 'expense' ? 'Add Expense' : type === 'customer' ? 'Add Customer' : 'Quick Entry'}</h3><button className="modal-close" onClick={onClose}><X size={20} /></button></div>
        <form onSubmit={handleSubmit}>
          {(type === 'sale' || type === 'capture') && <>
            <div className="form-group"><label>Customer Name</label><input type="text" placeholder="Walk-in customer" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} /></div>
            <div className="form-group"><label>Amount (₹)</label><input type="number" placeholder="Enter amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><input type="text" placeholder="What was sold?" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            <div className="form-group"><label>Payment Method</label><select className="select-input" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option></select></div>
          </>}
          {type === 'expense' && <>
            <div className="form-group"><label>Category</label><select className="select-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}><option>Utilities</option><option>Rent</option><option>Supplies</option><option>Salaries</option><option>Marketing</option><option>Travel</option><option>Equipment</option><option>Other</option></select></div>
            <div className="form-group"><label>Amount (₹)</label><input type="number" placeholder="Enter amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><textarea placeholder="Expense details" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea></div>
          </>}
          {type === 'customer' && <>
            <div className="form-group"><label>Full Name</label><input type="text" placeholder="Customer name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div className="form-group"><label>Email</label><input type="email" placeholder="customer@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required /></div>
            <div className="form-group"><label>Phone</label><input type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div className="form-group"><label>Address</label><textarea placeholder="Customer address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}></textarea></div>
          </>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>Save</button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    const token = localStorage.getItem('spadesk_token')
    const userData = localStorage.getItem('spadesk_user')
    if (token && userData) setUser(JSON.parse(userData))
  }, [])

  const handleLogin = (userData) => setUser(userData)
  const handleLogout = () => { localStorage.removeItem('spadesk_token'); localStorage.removeItem('spadesk_user'); setUser(null) }

  if (!user) return <BrowserRouter><Routes><Route path="/*" element={<Login onLogin={handleLogin} />} /></Routes></BrowserRouter>

  return <BrowserRouter><Routes><Route path="/home" element={<Home user={user} onLogout={handleLogout} />} /><Route path="/database" element={<DatabaseView user={user} />} /><Route path="/download" element={<DownloadView user={user} />} /><Route path="/*" element={<Navigate to="/home" />} /></Routes></BrowserRouter>
}

export default App