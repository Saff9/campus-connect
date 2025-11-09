import { useState } from 'react'

export default function Home() {
  const [currentView, setCurrentView] = useState('landing')
  const [authMode, setAuthMode] = useState('login')

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
          <div style={styles.heroButtons}>
            <button 
              onClick={() => {
                setCurrentView('auth')
                setAuthMode('register')
              }}
              style={styles.btnLargePrimary}
            >
              Get Started Free
            </button>
            <button 
              onClick={() => setCurrentView('auth')}
              style={styles.btnLargeSecondary}
            >
              Sign In
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Auth Page
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

        <form style={styles.form}>
          {authMode === 'register' && (
            <div style={styles.nameFields}>
              <input
                placeholder="First Name"
                style={styles.input}
              />
              <input
                placeholder="Last Name"
                style={styles.input}
              />
            </div>
          )}
          <input
            type="email"
            placeholder="Email Address"
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            style={styles.input}
          />
          <button type="submit" style={styles.submitButton}>
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={styles.demoNote}>
          <p>🚀 Backend API: campus-connect-f2it.onrender.com</p>
          <p>✨ Full chat features coming soon!</p>
        </div>
      </div>
    </div>
  )
}

// All styles in one object
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
    padding: '100px 20px',
    maxWidth: '800px',
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
    marginBottom: '40px',
    opacity: 0.9
  },
  heroButtons: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center'
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
    maxWidth: '400px',
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
  demoNote: {
    marginTop: '30px',
    padding: '15px',
    background: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center'
  }
}
