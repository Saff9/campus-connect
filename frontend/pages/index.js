import { useState, useEffect } from 'react';

const API_URL = 'https://campus-connect-f2it.onrender.com/api';

export default function CampusConnect() {
  const [view, setView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');

  const [authForm, setAuthForm] = useState({ 
    firstName: '', lastName: '', email: '', password: '' 
  });

  // Check backend status
  useEffect(() => {
    checkBackend();
    const token = localStorage.getItem('token');
    if (token) checkAuth(token);
  }, []);

  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      setBackendStatus(res.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  };

  const checkAuth = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setView('dashboard');
        loadGroups();
      }
    } catch {
      localStorage.removeItem('token');
    }
  };

  const loadGroups = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups);
      if (data.groups.length > 0 && !selectedGroup) {
        setSelectedGroup(data.groups[0]);
      }
    }
  };

  const loadMessages = async () => {
    if (!selectedGroup) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/messages/${selectedGroup.id}/${selectedChannel}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [selectedGroup, selectedChannel]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setView('dashboard');
        loadGroups();
        setMessage('Success! Welcome to CampusConnect 🎉');
      } else {
        setMessage(data.message || 'Authentication failed');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('landing');
    setGroups([]);
    setMessages([]);
    setSelectedGroup(null);
  };

  const createGroup = async () => {
    const name = prompt('Enter group name:');
    if (!name) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, type: 'club' })
    });

    if (res.ok) {
      const data = await res.json();
      setGroups(prev => [...prev, data.group]);
      setSelectedGroup(data.group);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/messages/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        content: { text: newMessage },
        group: selectedGroup.id,
        channel: selectedChannel,
        type: 'text'
      })
    });

    if (res.ok) {
      setNewMessage('');
      loadMessages();
    }
  };

  const createPoll = async () => {
    const question = prompt('Poll question:');
    if (!question) return;
    
    const options = prompt('Options (comma separated):');
    if (!options) return;

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/polls`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        question,
        options: options.split(',').map(opt => opt.trim()),
        group: selectedGroup.id,
        channel: selectedChannel
      })
    });

    if (res.ok) {
      loadMessages();
    }
  };

  // Landing Page
  if (view === 'landing') {
    return (
      <div style={styles.landing}>
        <nav style={styles.nav}>
          <div style={styles.logo}>💬 CampusConnect</div>
          <div style={styles.navButtons}>
            <button onClick={() => setView('auth')} style={styles.btnSecondary}>Login</button>
            <button onClick={() => { setView('auth'); setAuthMode('register'); }} style={styles.btnPrimary}>Sign Up</button>
          </div>
        </nav>
        
        <main style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Connect. Collaborate. <span style={styles.highlight}>Succeed.</span>
          </h1>
          <p style={styles.heroSubtitle}>
            Modern communication platform for students, clubs, and organizations
          </p>

          <div style={{
            ...styles.status,
            ...(backendStatus === 'online' ? styles.statusOnline : styles.statusOffline)
          }}>
            {backendStatus === 'online' ? '✅ Backend Connected' : '❌ Backend Offline'}
          </div>

          <div style={styles.heroButtons}>
            <button 
              onClick={() => { setView('auth'); setAuthMode('register'); }}
              style={styles.btnLargePrimary}
            >
              Get Started Free
            </button>
            <button 
              onClick={() => setView('auth')}
              style={styles.btnLargeSecondary}
            >
              Sign In
            </button>
          </div>

          <div style={styles.features}>
            {[
              { icon: '💬', title: 'Smart Messaging', desc: 'Real-time chat with organized channels' },
              { icon: '👥', title: 'Group Management', desc: 'Create and manage clubs easily' },
              { icon: '📚', title: 'Study Mode', desc: 'Focus without distractions' },
              { icon: '📊', title: 'Polls & Surveys', desc: 'Make decisions together' },
              { icon: '🎯', title: 'Event Planning', desc: 'Schedule and organize events' },
              { icon: '🔒', title: 'Secure & Private', desc: 'End-to-end encryption' }
            ].map((feature, i) => (
              <div key={i} style={styles.feature}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Auth Page
  if (view === 'auth') {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <div style={styles.authHeader}>
            <button onClick={() => setView('landing')} style={styles.backButton}>← Back</button>
            <h2 style={styles.authTitle}>
              {authMode === 'login' ? 'Welcome Back' : 'Join CampusConnect'}
            </h2>
          </div>

          <div style={styles.tabs}>
            <button
              onClick={() => setAuthMode('login')}
              style={{...styles.tab, ...(authMode === 'login' && styles.tabActive)}}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              style={{...styles.tab, ...(authMode === 'register' && styles.tabActive)}}
            >
              Create Account
            </button>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              ...(message.includes('Success') ? styles.messageSuccess : styles.messageError)
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} style={styles.form}>
            {authMode === 'register' && (
              <div style={styles.nameFields}>
                <input
                  placeholder="First Name"
                  value={authForm.firstName}
                  onChange={e => setAuthForm({...authForm, firstName: e.target.value})}
                  style={styles.input}
                  required
                />
                <input
                  placeholder="Last Name"
                  value={authForm.lastName}
                  onChange={e => setAuthForm({...authForm, lastName: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
            )}
            <input
              type="email"
              placeholder="Email Address"
              value={authForm.email}
              onChange={e => setAuthForm({...authForm, email: e.target.value})}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={e => setAuthForm({...authForm, password: e.target.value})}
              style={styles.input}
              required
              minLength="6"
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading && styles.submitButtonDisabled)
              }}
            >
              {loading ? 'Please Wait...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div style={styles.dashboard}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>💬 CampusConnect</div>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
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
          <div style={styles.sectionTitle}>Your Groups</div>
          <button onClick={createGroup} style={styles.addButton}>+ Create Group</button>
          {groups.map(group => (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              style={{
                ...styles.groupItem,
                ...(selectedGroup?.id === group.id && styles.groupItemActive)
              }}
            >
              <div style={styles.groupAvatar}>{group.name[0]}</div>
              <div style={styles.groupInfo}>
                <div style={styles.groupName}>{group.name}</div>
                <div style={styles.groupMembers}>
                  {group.members?.length || 1} members
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {selectedGroup ? (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div>
                <h2 style={styles.channelName}>#{selectedChannel}</h2>
                <p style={styles.groupInfo}>
                  {selectedGroup.name} • {messages.length} messages
                </p>
              </div>
              <div style={styles.channelTabs}>
                {selectedGroup.channels?.map(channel => (
                  <button
                    key={channel.name || channel}
                    onClick={() => setSelectedChannel(channel.name || channel)}
                    style={{
                      ...styles.channelTab,
                      ...(selectedChannel === (channel.name || channel) && styles.channelTabActive)
                    }}
                  >
                    #{channel.name || channel}
                  </button>
                ))}
              </div>
              <div style={styles.chatActions}>
                <button onClick={createPoll} style={styles.actionButton}>📊 Poll</button>
                <button style={styles.actionButton}>📅 Event</button>
              </div>
            </div>

            {/* Messages */}
            <div style={styles.messagesContainer}>
              {messages.map(msg => (
                <div key={msg.id} style={styles.messageBubble}>
                  <div style={styles.messageHeader}>
                    <span style={styles.senderName}>
                      {msg.sender?.firstName || msg.sender?.name}
                    </span>
                    <span style={styles.messageTime}>
                      {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={styles.messageContent}>
                    {msg.content?.text}
                    {msg.type === 'poll' && ' 📊 Poll: ' + (msg.metadata?.poll?.question || msg.content?.text)}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} style={styles.messageForm}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={`Message #${selectedChannel}`}
                style={styles.messageInput}
              />
              <button type="submit" style={styles.sendButton}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={styles.welcomeDashboard}>
            <div style={styles.welcomeIcon}>💬</div>
            <h1>Welcome to CampusConnect, {user?.firstName}! 🎉</h1>
            <p>Select a group or create one to start chatting with your community</p>
            <button onClick={createGroup} style={styles.btnLargePrimary}>
              Create Your First Group
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// All Styles in One Object
const styles = {
  // Landing Page Styles
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
    padding: '80px 20px',
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
  status: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '30px',
    fontWeight: '600',
    fontSize: '16px'
  },
  statusOnline: {
    background: '#dcfce7',
    color: '#166534'
  },
  statusOffline: {
    background: '#fee2e2',
    color: '#991b1b'
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
    marginTop: '40px'
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

  // Auth Page Styles
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

  // Dashboard Styles
  dashboard: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  sidebar: {
    width: '300px',
    background: '#1f2937',
    color: 'white',
    padding: '20px',
    overflowY: 'auto'
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
    fontWeight: '500',
    marginBottom: '15px'
  },
  groupItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '8px'
  },
  groupItemActive: {
    background: '#374151'
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
    fontSize: '12px'
  },
  groupInfo: {
    flex: 1
  },
  groupName: {
    fontWeight: '500',
    fontSize: '14px'
  },
  groupMembers: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#f9fafb'
  },
  chatHeader: {
    background: 'white',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  channelName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600'
  },
  groupInfo: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px'
  },
  channelTabs: {
    display: 'flex',
    gap: '10px'
  },
  channelTab: {
    background: 'none',
    border: '1px solid #d1d5db',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  channelTabActive: {
    background: '#4f46e5',
    color: 'white',
    borderColor: '#4f46e5'
  },
  chatActions: {
    display: 'flex',
    gap: '10px'
  },
  actionButton: {
    background: 'transparent',
    border: '1px solid #d1d5db',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  messagesContainer: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto'
  },
  messageBubble: {
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
  senderName: {
    fontWeight: '600',
    color: '#1f2937'
  },
  messageTime: {
    fontSize: '12px',
    color: '#6b7280'
  },
  messageContent: {
    color: '#374151'
  },
  messageForm: {
    display: 'flex',
    padding: '20px',
    background: 'white',
    borderTop: '1px solid #e5e7eb',
    gap: '12px'
  },
  messageInput: {
    flex: 1,
    padding: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px'
  },
  sendButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  welcomeDashboard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px'
  },
  welcomeIcon: {
    fontSize: '80px',
    marginBottom: '20px'
  }
};
