import { useState, useEffect } from 'react'

export default function Home() {
  const [currentView, setCurrentView] = useState('landing')
  const [authMode, setAuthMode] = useState('login')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [backendStatus, setBackendStatus] = useState('checking')
  
  const [authForm, setAuthForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  })

  // Check backend status on load
  useEffect(() => {
    checkBackendStatus()
  }, [])

  const checkBackendStatus = async () => {
    try {
      setBackendStatus('checking')
      const response = await fetch('https://campus-connect-f2it.onrender.com/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        setBackendStatus('online')
      } else {
        setBackendStatus('error')
      }
    } catch (error) {
      console.error('Backend check failed:', error)
      setBackendStatus('offline')
    }
  }

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && backendStatus === 'online') {
      checkAuth(token)
    }
  }, [backendStatus])

  const checkAuth = async (token) => {
    try {
      const response = await fetch('https://campus-connect-f2it.onrender.com/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setCurrentView('dashboard')
      } else {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const response = await fetch(`https://campus-connect-f2it.onrender.com/api${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authForm)
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        setCurrentView('dashboard')
        setMessage('Success! Redirecting...')
      } else {
        setMessage(data.message || `Error: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Network error details:', error)
      setMessage(`Network error: ${error.message}. Please check if backend is running.`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setCurrentView('landing')
    setAuthForm({ firstName: '', lastName: '', email: '', password: '' })
  }

  const handleInputChange = (e) => {
    setAuthForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div style={styles.landing}>
        <nav style={styles.nav}>
          <div style={styles.logo}>💬 CampusConnect</div>
          <div style={styles.navButtons}>
            <button 
              onClick={() => setCurrentView('auth')}
              style={styles.btnSecondary}
            >
              Login
            </button>
            <button 
              onClick={() => {
                setCurrentView('auth')
                setAuthMode('register')
              }}
              style={styles.btnPrimary}
            >
              Sign Up
            </button>
          </div>
        </nav>
        
        <main style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Connect. Collaborate. <span style={styles.highlight}>Succeed.</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Modern communication platform for students, clubs, and organizations
          </p>

          {/* Backend Status Indicator */}
          <div style={{
            ...styles.backendStatus,
            ...(backendStatus === 'online' ? styles.statusOnline : 
                 backendStatus === 'offline' ? styles.statusOffline : styles.statusChecking)
          }}>
            {backendStatus === 'online' && '✅ Backend API: Connected'}
            {backendStatus === 'offline' && '❌ Backend API: Offline'}
            {backendStatus === 'checking' && '⏳ Checking backend status...'}
            {backendStatus === 'error' && '⚠️ Backend API: Connection Error'}
          </div>

          <div style={styles.heroButtons}>
            <button 
              onClick={() => {
                setCurrentView('auth')
                setAuthMode('register')
              }}
              style={styles.btnLargePrimary}
              disabled={backendStatus !== 'online'}
            >
              {backendStatus === 'online' ? 'Get Started Free' : 'Waiting for Backend...'}
            </button>
            <button 
              onClick={() => setCurrentView('auth')}
              style={styles.btnLargeSecondary}
            >
              Sign In
            </button>
          </div>

          <div style={styles.features}>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>💬</div>
              <h3>Smart Messaging</h3>
              <p>Real-time chat with organized channels and file sharing</p>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>👥</div>
              <h3>Group Management</h3>
              <p>Create and manage clubs, organizations, and study groups</p>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>📚</div>
              <h3>Study Mode</h3>
              <p>Focus on your work with smart Do Not Disturb features</p>
            </div>
          </div>

          {/* Troubleshooting Section */}
          {backendStatus !== 'online' && (
            <div style={styles.troubleshooting}>
              <h3>🔧 Connection Issues?</h3>
              <p>Backend might be starting up. Try these steps:</p>
              <ul style={styles.troubleshootingList}>
                <li>Wait 1-2 minutes for backend to start</li>
                <li>Refresh this page</li>
                <li>Check <a href="https://campus-connect-f2it.onrender.com/api/health" target="_blank" style={styles.link}>backend status</a></li>
                <li>Contact support if issue persists</li>
              </ul>
              <button onClick={checkBackendStatus} style={styles.retryButton}>
                🔄 Check Again
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Auth Page
  if (currentView === 'auth') {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <div style={styles.authHeader}>
            <button 
              onClick={() => setCurrentView('landing')}
              style={styles.backButton}
            >
              ← Back to Home
            </button>
            <h2 style={styles.authTitle}>
              {authMode === 'login' ? 'Welcome Back' : 'Join CampusConnect'}
            </h2>
            
            {/* Backend Status in Auth */}
            <div style={{
              ...styles.backendStatusSmall,
              ...(backendStatus === 'online' ? styles.statusOnline : styles.statusOffline)
            }}>
              {backendStatus === 'online' ? '✅ Backend Connected' : '❌ Backend Offline'}
            </div>
          </div>

          <div style={styles.tabs}>
            <button
              onClick={() => setAuthMode('login')}
              style={{
                ...styles.tab,
                ...(authMode === 'login' && styles.tabActive)
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              style={{
                ...styles.tab,
                ...(authMode === 'register' && styles.tabActive)
              }}
            >
              Create Account
            </button>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              ...(message.includes('Success') ? styles.messageSuccess : 
                   message.includes('Network error') ? styles.messageError : styles.messageWarning)
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} style={styles.form}>
            {authMode === 'register' && (
              <div style={styles.nameFields}>
                <input
                  name="firstName"
                  placeholder="First Name"
                  value={authForm.firstName}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
                <input
                  name="lastName"
                  placeholder="Last Name"
                  value={authForm.lastName}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>
            )}
            <input
              name="email"
              type="email"
              placeholder="Email Address"
              value={authForm.email}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={handleInputChange}
              style={styles.input}
              required
              minLength="6"
            />
            <button 
              type="submit" 
              disabled={loading || backendStatus !== 'online'}
              style={{
                ...styles.submitButton,
                ...((loading || backendStatus !== 'online') && styles.submitButtonDisabled)
              }}
            >
              {loading ? 'Please Wait...' : 
               backendStatus !== 'online' ? 'Backend Offline' :
               authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={styles.demoNote}>
            <p><strong>Backend URL:</strong> campus-connect-f2it.onrender.com</p>
            <p><strong>Status:</strong> {backendStatus}</p>
            <button onClick={checkBackendStatus} style={styles.smallButton}>
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard
  return (
    <div style={styles.dashboard}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>💬 CampusConnect</div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <div style={styles.userName}>{user?.firstName} {user?.lastName}</div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Your Groups</h3>
          <button style={styles.addButton}>
            + Create Group
          </button>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <div style={styles.welcomeMessage}>
          <h1>Welcome to CampusConnect, {user?.firstName}! 🎉</h1>
          <p>Your student communication platform is ready to use.</p>
          
          <div style={styles.backendStatusCard}>
            <h3>🔌 Connection Status</h3>
            <div style={{
              ...styles.statusIndicator,
              ...(backendStatus === 'online' ? styles.statusOnline : styles.statusOffline)
            }}>
              {backendStatus === 'online' ? '✅ Backend Connected' : '❌ Backend Issues'}
            </div>
            <button onClick={checkBackendStatus} style={styles.smallButton}>
              Check Connection
            </button>
          </div>

          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <h3>🎯 Next Steps</h3>
              <ul style={styles.featureList}>
                <li>Create your first group</li>
                <li>Invite other students</li>
                <li>Start chatting in channels</li>
                <li>Schedule events and meetings</li>
              </ul>
            </div>
            <div style={styles.featureCard}>
              <h3>📊 System Status</h3>
              <p>Frontend: ✅ Deployed</p>
              <p>Backend: {backendStatus === 'online' ? '✅ Connected' : '❌ Issues'}</p>
              <p>Authentication: ✅ Working</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// All styles
const styles = {
  landing: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold'
  },
  navButtons: {
    display: 'flex',
    gap: '12px'
  },
  btnPrimary: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnSecondary: {
    background: 'transparent',
    color: 'white',
    border: '1px solid white',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  hero: {
    textAlign: 'center',
    padding: '60px 20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '20px',
    lineHeight: '1.2'
  },
  highlight: {
    color: '#fbbf24'
  },
  heroSubtitle: {
    fontSize: '20px',
    marginBottom: '30px',
    opacity: 0.9
  },
  backendStatus: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '30px',
    fontWeight: '600',
    fontSize: '16px'
  },
  backendStatusSmall: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '10px'
  },
  statusOnline: {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0'
  },
  statusOffline: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  statusChecking: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  heroButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '60px'
  },
  btnLargePrimary: {
    background: '#fbbf24',
    color: '#1f2937',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnLargeSecondary: {
    background: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '16px 32px',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginBottom: '40px'
  },
  feature: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '30px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
  },
  featureIcon: {
    fontSize: '40px',
    marginBottom: '15px'
  },
  troubleshooting: {
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '25px',
    borderRadius: '12px',
    marginTop: '30px',
    backdropFilter: 'blur(10px)'
  },
  troubleshootingList: {
    textAlign: 'left',
    margin: '15px 0',
    paddingLeft: '20px'
  },
  link: {
    color: '#fbbf24',
    textDecoration: 'underline'
  },
  retryButton: {
    background: '#fbbf24',
    color: '#1f2937',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    marginTop: '10px'
  },
  authPage: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  authCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 20px 25px rgba(0,0,0,0.1)'
  },
  authHeader: {
    marginBottom: '30px'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '15px',
    fontSize: '14px'
  },
  authTitle: {
    margin: '0 0 10px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '30px'
  },
  tab: {
    flex: 1,
    padding: '15px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontSize: '16px',
    fontWeight: '500',
    color: '#6b7280'
  },
  tabActive: {
    borderBottomColor: '#4f46e5',
    color: '#4f46e5'
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontWeight: '500'
  },
  messageSuccess: {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0'
  },
  messageError: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  messageWarning: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  nameFields: {
    display: 'flex',
    gap: '15px'
  },
  input: {
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    width: '100%',
    boxSizing: 'border-box'
  },
  submitButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px'
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  demoNote: {
    marginTop: '30px',
    padding: '15px',
    background: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center'
  },
  smallButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '10px'
  },
  dashboard: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  sidebar: {
    width: '300px',
    background: '#1f2937',
    color: 'white',
    padding: '20px'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  logoutButton: {
    background: 'transparent',
    color: 'white',
    border: '1px solid #6b7280',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #374151'
  },
  avatar: {
    width: '40px',
    height: '40px',
    background: '#4f46e5',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  userName: {
    fontWeight: '600',
    fontSize: '16px'
  },
  userEmail: {
    fontSize: '14px',
    color: '#9ca3af'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#d1d5db'
  },
  addButton: {
    width: '100%',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  mainContent: {
    flex: 1,
    background: '#f9fafb',
    padding: '40px'
  },
  welcomeMessage: {
    maxWidth: '800px'
  },
  backendStatusCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statusIndicator: {
    padding: '10px',
    borderRadius: '6px',
    fontWeight: '600',
    margin: '10px 0'
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '30px'
  },
  featureCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  featureList: {
    marginTop: '15px',
    paddingLeft: '20px'
  }
}
