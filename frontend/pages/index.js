import { useState, useEffect } from 'react';

export default function CampusConnect() {
  const [currentView, setCurrentView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(null);
  
  // Simple API function
  const apiCall = async (endpoint, options = {}) => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://campus-connect-f2it.onrender.com/api';
    try {
      const response = await fetch(baseURL + endpoint, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  };

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setCurrentView('dashboard');
  }, []);

  // Handle authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const result = await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.token) {
      localStorage.setItem('token', result.token);
      setUser(result.user);
      setCurrentView('dashboard');
    }
  };

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div style={styles.landing}>
        <nav style={styles.nav}>
          <div style={styles.logo}>💬 CampusConnect</div>
          <div>
            <button onClick={() => setCurrentView('auth')} style={styles.btnSecondary}>Login</button>
            <button onClick={() => { setCurrentView('auth'); setAuthMode('register'); }} style={styles.btnPrimary}>Sign Up</button>
          </div>
        </nav>
        
        <main style={styles.hero}>
          <h1 style={styles.heroTitle}>Connect. Collaborate. Succeed.</h1>
          <p style={styles.heroSubtitle}>Modern communication for students and clubs</p>
          <div style={styles.heroButtons}>
            <button onClick={() => { setCurrentView('auth'); setAuthMode('register'); }} style={styles.btnLargePrimary}>Get Started</button>
            <button onClick={() => setCurrentView('auth')} style={styles.btnLargeSecondary}>Sign In</button>
          </div>
        </main>
      </div>
    );
  }

  // Auth Page
  if (currentView === 'auth') {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <button onClick={() => setCurrentView('landing')} style={styles.backBtn}>← Back</button>
          <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          
          <div style={styles.tabs}>
            <button onClick={() => setAuthMode('login')} style={{...styles.tab, ...(authMode === 'login' ? styles.tabActive : {})}}>Sign In</button>
            <button onClick={() => setAuthMode('register')} style={{...styles.tab, ...(authMode === 'register' ? styles.tabActive : {})}}>Sign Up</button>
          </div>
          
          <form onSubmit={handleAuth} style={styles.form}>
            {authMode === 'register' && (
              <div style={styles.nameFields}>
                <input name="firstName" placeholder="First Name" style={styles.input} required />
                <input name="lastName" placeholder="Last Name" style={styles.input} required />
              </div>
            )}
            <input name="email" type="email" placeholder="Email" style={styles.input} required />
            <input name="password" type="password" placeholder="Password" style={styles.input} required />
            <button type="submit" style={styles.submitBtn}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div style={styles.dashboard}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>💬 CampusConnect</div>
          <button onClick={() => { localStorage.removeItem('token'); setCurrentView('landing'); }} style={styles.logoutBtn}>Logout</button>
        </div>
        <div style={styles.userSection}>
          <div style={styles.avatar}>{(user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '')}</div>
          <div>
            <div style={styles.userName}>{user?.firstName} {user?.lastName}</div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>
        <div style={styles.groups}>
          <div style={styles.sectionTitle}>Your Groups</div>
          <button onClick={() => alert('Create group functionality')} style={styles.addBtn}>+ Create Group</button>
        </div>
      </aside>
      
      <main style={styles.chatArea}>
        <div style={styles.chatHeader}>
          <h2>#general</h2>
          <p>Welcome to your workspace! Start chatting with your team.</p>
        </div>
        <div style={styles.messages}>
          <div style={styles.message}>
            <div style={styles.messageHeader}>
              <strong>System</strong>
              <span style={styles.messageTime}>Just now</span>
            </div>
            <div>Welcome to CampusConnect! Start by creating a group and inviting members.</div>
          </div>
        </div>
        <form style={styles.messageForm}>
          <input placeholder="Type a message..." style={styles.messageInput} />
          <button type="submit" style={styles.sendBtn}>Send</button>
        </form>
      </main>
    </div>
  );
}

// All styles in one object
const styles = {
  landing: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    padding: '0 20px'
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 0',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold'
  },
  btnPrimary: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    marginLeft: '10px',
    cursor: 'pointer'
  },
  btnSecondary: {
    background: 'transparent',
    color: 'white',
    border: '1px solid white',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer'
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
    marginBottom: '20px'
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
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  btnLargeSecondary: {
    background: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '15px 30px',
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
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '20px'
  },
  tab: {
    flex: 1,
    padding: '15px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent'
  },
  tabActive: {
    borderBottomColor: '#4f46e5',
    color: '#4f46e5',
    fontWeight: 'bold'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  nameFields: {
    display: 'flex',
    gap: '15px'
  },
  input: {
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    width: '100%'
  },
  submitBtn: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '15px',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  dashboard: {
    display: 'flex',
    height: '100vh'
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
  logoutBtn: {
    background: 'none',
    border: '1px solid #6b7280',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #374151'
  },
  avatar: {
    width: '50px',
    height: '50px',
    background: '#4f46e5',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  userName: {
    fontWeight: 'bold'
  },
  userEmail: {
    color: '#9ca3af',
    fontSize: '14px'
  },
  groups: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: '15px'
  },
  addBtn: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#f9fafb'
  },
  chatHeader: {
    background: 'white',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb'
  },
  messages: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  },
  message: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  messageTime: {
    color: '#6b7280',
    fontSize: '12px'
  },
  messageForm: {
    display: 'flex',
    padding: '20px',
    background: 'white',
    borderTop: '1px solid #e5e7eb',
    gap: '10px'
  },
  messageInput: {
    flex: 1,
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  sendBtn: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};
