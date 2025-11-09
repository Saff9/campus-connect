'use client'

import { useState, useEffect } from 'react'

// Simple API client
const api = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://campus-connect-f2it.onrender.com/api',
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }
    
    if (options.body) config.body = JSON.stringify(options.body)
    
    try {
      const response = await fetch(url, config)
      const data = await response.json()
      return { data, status: response.status }
    } catch (error) {
      return { error: error.message }
    }
  }
}

export default function CampusConnect() {
  const [currentView, setCurrentView] = useState('landing') // landing, auth, dashboard
  const [authMode, setAuthMode] = useState('login') // login, register
  const [user, setUser] = useState(null)
  const [groups, setGroups] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Auth form state
  const [authForm, setAuthForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  })
  
  // Chat state
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState('general')
  const [newMessage, setNewMessage] = useState('')

  // Check if user is logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      loadUserProfile()
    }
  }, [])

  // Load messages when group/channel changes
  useEffect(() => {
    if (selectedGroup) {
      loadMessages()
    }
  }, [selectedGroup, selectedChannel])

  const loadUserProfile = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    
    const { data } = await api.request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (data && data.user) {
      setUser(data.user)
      setCurrentView('dashboard')
      loadGroups()
    }
  }

  const loadGroups = async () => {
    const token = localStorage.getItem('token')
    const { data } = await api.request('/groups', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (data && data.groups) {
      setGroups(data.groups)
      if (data.groups.length > 0 && !selectedGroup) {
        setSelectedGroup(data.groups[0])
      }
    }
  }

  const loadMessages = async () => {
    if (!selectedGroup) return
    
    const token = localStorage.getItem('token')
    const { data } = await api.request(`/messages/${selectedGroup.id}/${selectedChannel}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (data && data.messages) {
      setMessages(data.messages)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
    const { data } = await api.request(endpoint, {
      method: 'POST',
      body: authForm
    })
    
    if (data && data.token) {
      localStorage.setItem('token', data.token)
      setUser(data.user)
      setCurrentView('dashboard')
      loadGroups()
    }
    
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setCurrentView('landing')
    setGroups([])
    setMessages([])
  }

  const createGroup = async () => {
    const name = prompt('Enter group name:')
    if (!name) return
    
    const token = localStorage.getItem('token')
    const { data } = await api.request('/groups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { name, type: 'club' }
    })
    
    if (data && data.group) {
      setGroups(prev => [...prev, data.group])
      setSelectedGroup(data.group)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedGroup) return
    
    const token = localStorage.getItem('token')
    const { data } = await api.request('/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        content: { text: newMessage },
        group: selectedGroup.id,
        channel: selectedChannel,
        type: 'text'
      }
    })
    
    if (data && data.message) {
      setMessages(prev => [...prev, data.message])
      setNewMessage('')
    }
  }

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div style={styles.landing}>
        <nav style={styles.nav}>
          <div style={styles.navContent}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>💬</div>
              <span style={styles.logoText}>CampusConnect</span>
            </div>
            <div style={styles.navButtons}>
              <button 
                onClick={() => setCurrentView('auth')}
                style={styles.secondaryButton}
              >
                Login
              </button>
              <button 
                onClick={() => {
                  setCurrentView('auth')
                  setAuthMode('register')
                }}
                style={styles.primaryButton}
              >
                Sign Up
              </button>
            </div>
          </div>
        </nav>

        <main style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              Connect. Collaborate. <span style={styles.highlight}>Succeed.</span>
            </h1>
            <p style={styles.heroSubtitle}>
              Modern communication for students, clubs, and organizations
            </p>
            <div style={styles.heroButtons}>
              <button 
                onClick={() => {
                  setCurrentView('auth')
                  setAuthMode('register')
                }}
                style={styles.heroPrimaryButton}
              >
                Get Started Free
              </button>
              <button 
                onClick={() => setCurrentView('auth')}
                style={styles.heroSecondaryButton}
              >
                Sign In
              </button>
            </div>
          </div>

          <div style={styles.features}>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>💬</div>
              <h3>Smart Messaging</h3>
              <p>Real-time chat with organized channels</p>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>👥</div>
              <h3>Group Management</h3>
              <p>Create and manage clubs easily</p>
            </div>
            <div style={styles.feature}>
              <div style={styles.featureIcon}>📚</div>
              <h3>Study Mode</h3>
              <p>Focus without distractions</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Auth Page
  if (currentView === 'auth') {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <div style={styles.authHeader}>
            <button onClick={() => setCurrentView('landing')} style={styles.backButton}>
              ← Back
            </button>
            <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          </div>

          <div style={styles.authTabs}>
            <button
              onClick={() => setAuthMode('login')}
              style={{
                ...styles.authTab,
                ...(authMode === 'login' ? styles.authTabActive : {})
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              style={{
                ...styles.authTab,
                ...(authMode === 'register' ? styles.authTabActive : {})
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} style={styles.authForm}>
            {authMode === 'register' && (
              <div style={styles.nameFields}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={authForm.firstName}
                  onChange={(e) => setAuthForm(prev => ({...prev, firstName: e.target.value}))}
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={authForm.lastName}
                  onChange={(e) => setAuthForm(prev => ({...prev, lastName: e.target.value}))}
                  style={styles.input}
                  required
                />
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm(prev => ({...prev, email: e.target.value}))}
              style={styles.input}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm(prev => ({...prev, password: e.target.value}))}
              style={styles.input}
              required
            />

            <button 
              type="submit" 
              disabled={loading}
              style={styles.authSubmit}
            >
              {loading ? 'Loading...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Dashboard/Chat Interface
  return (
    <div style={styles.dashboard}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>💬</div>
            <span style={styles.logoText}>CampusConnect</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        <div style={styles.userInfo}>
          <div style={styles.avatar}>{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
          <div>
            <div style={styles.userName}>{user?.firstName} {user?.lastName}</div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>

        <div style={styles.groupsSection}>
          <div style={styles.sectionHeader}>
            <span>Your Groups</span>
            <button onClick={createGroup} style={styles.addButton}>+</button>
          </div>
          {groups.map(group => (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              style={{
                ...styles.groupItem,
                ...(selectedGroup?.id === group.id ? styles.groupItemActive : {})
              }}
            >
              <div style={styles.groupAvatar}>{group.name[0]}</div>
              <div>
                <div style={styles.groupName}>{group.name}</div>
                <div style={styles.groupMembers}>{group.members?.length || 0} members</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={styles.chatArea}>
        {selectedGroup ? (
          <>
            <div style={styles.chatHeader}>
              <div>
                <h2 style={styles.channelName}>#{selectedChannel}</h2>
                <p style={styles.groupInfo}>{selectedGroup.name} • {messages.length} messages</p>
              </div>
              <div style={styles.channelSelector}>
                {selectedGroup.channels?.map(channel => (
                  <button
                    key={channel.name}
                    onClick={() => setSelectedChannel(channel.name)}
                    style={{
                      ...styles.channelButton,
                      ...(selectedChannel === channel.name ? styles.channelButtonActive : {})
                    }}
                  >
                    #{channel.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.messagesContainer}>
              {messages.map(message => (
                <div key={message.id} style={styles.message}>
                  <div style={styles.messageHeader}>
                    <span style={styles.senderName}>
                      {message.sender?.firstName} {message.sender?.lastName}
                    </span>
                    <span style={styles.messageTime}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={styles.messageContent}>{message.content?.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} style={styles.messageForm}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message #${selectedChannel}`}
                style={styles.messageInput}
              />
              <button type="submit" style={styles.sendButton}>Send</button>
            </form>
          </>
        ) : (
          <div style={styles.noGroupSelected}>
            <div style={styles.noGroupIcon}>💬</div>
            <h3>Welcome to CampusConnect</h3>
            <p>Select a group or create one to start chatting</p>
            <button onClick={createGroup} style={styles.primaryButton}>
              Create Your First Group
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// All styles in one object
const styles = {
  // Landing Page Styles
  landing: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  nav: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '1rem 0',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logoIcon: {
    fontSize: '1.5rem',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  navButtons: {
    display: 'flex',
    gap: '1rem',
  },
  primaryButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  secondaryButton: {
    background: 'transparent',
    color: 'white',
    border: '1px solid white',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
  },
  hero: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '4rem 1rem',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  highlight: {
    color: '#fbbf24',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    marginBottom: '2rem',
    opacity: 0.9,
  },
  heroButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '4rem',
  },
  heroPrimaryButton: {
    background: '#fbbf24',
    color: '#1f2937',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '0.5rem',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  heroSecondaryButton: {
    background: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '1rem 2rem',
    borderRadius: '0.5rem',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginTop: '4rem',
  },
  feature: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '2rem',
    borderRadius: '1rem',
    textAlign: 'center',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },

  // Auth Page Styles
  authContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  authCard: {
    background: 'white',
    borderRadius: '1rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  authHeader: {
    marginBottom: '1.5rem',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  authTabs: {
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  authTab: {
    flex: 1,
    padding: '0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  authTabActive: {
    borderBottomColor: '#4f46e5',
    color: '#4f46e5',
    fontWeight: '500',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  nameFields: {
    display: 'flex',
    gap: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    width: '100%',
  },
  authSubmit: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },

  // Dashboard Styles
  dashboard: {
    display: 'flex',
    height: '100vh',
  },
  sidebar: {
    width: '300px',
    background: '#1f2937',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #374151',
  },
  logoutButton: {
    background: 'none',
    border: '1px solid #6b7280',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
  },
  userInfo: {
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    borderBottom: '1px solid #374151',
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
  },
  userName: {
    fontWeight: '500',
  },
  userEmail: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
  groupsSection: {
    flex: 1,
    padding: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    fontWeight: '500',
  },
  addButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
  },
  groupItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    marginBottom: '0.5rem',
  },
  groupItemActive: {
    background: '#374151',
  },
  groupAvatar: {
    width: '32px',
    height: '32px',
    background: '#10b981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.875rem',
  },
  groupName: {
    fontWeight: '500',
  },
  groupMembers: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#f9fafb',
  },
  chatHeader: {
    background: 'white',
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600',
  },
  groupInfo: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  channelSelector: {
    display: 'flex',
    gap: '0.5rem',
  },
  channelButton: {
    background: 'none',
    border: '1px solid #d1d5db',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  channelButtonActive: {
    background: '#4f46e5',
    color: 'white',
    borderColor: '#4f46e5',
  },
  messagesContainer: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
  },
  message: {
    marginBottom: '1rem',
    background: 'white',
    padding: '1rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  senderName: {
    fontWeight: '500',
    color: '#1f2937',
  },
  messageTime: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  messageContent: {
    color: '#374151',
  },
  messageForm: {
    display: 'flex',
    padding: '1rem',
    background: 'white',
    borderTop: '1px solid #e5e7eb',
    gap: '0.5rem',
  },
  messageInput: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
  },
  sendButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
  noGroupSelected: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  noGroupIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
}
