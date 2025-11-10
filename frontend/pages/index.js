import { useState, useEffect, useRef } from 'react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const [authForm, setAuthForm] = useState({ 
    firstName: '', lastName: '', email: '', password: '' 
  });

  // Check backend and auth status
  useEffect(() => {
    checkBackend();
    const token = localStorage.getItem('token');
    if (token) checkAuth(token);
  }, []);

  // Socket connection
  useEffect(() => {
    if (user && backendStatus === 'online') {
      connectSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, backendStatus]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connectSocket = () => {
    socketRef.current = io(API_URL.replace('/api', ''), {
      transports: ['websocket']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
    });

    socketRef.current.on('new_message', (newMessage) => {
      if (newMessage.groupId === selectedGroup?.id && newMessage.channel === selectedChannel) {
        setMessages(prev => [...prev, newMessage]);
      }
    });

    socketRef.current.on('user_typing', (data) => {
      if (data.typing) {
        setTypingUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user]);
      } else {
        setTypingUsers(prev => prev.filter(u => u.id !== data.user.id));
      }
    });
  };

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
    setSidebarOpen(false); // Close sidebar on mobile when selecting group
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
    setSidebarOpen(false);
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
      body: JSON.stringify({ name, type: 'club', description: '' })
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
      if (socketRef.current) {
        socketRef.current.emit('typing_stop', { 
          groupId: selectedGroup.id, 
          channel: selectedChannel, 
          user: user 
        });
      }
    }
  };

  const handleTyping = () => {
    if (socketRef.current && selectedGroup) {
      socketRef.current.emit('typing_start', { 
        groupId: selectedGroup.id, 
        channel: selectedChannel, 
        user: user 
      });
    }
  };

  const stopTyping = () => {
    if (socketRef.current && selectedGroup) {
      socketRef.current.emit('typing_stop', { 
        groupId: selectedGroup.id, 
        channel: selectedChannel, 
        user: user 
      });
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

  const scheduleEvent = async () => {
    const title = prompt('Event title:');
    if (!title) return;
    
    const date = prompt('Event date (YYYY-MM-DD):');
    const time = prompt('Event time (HH:MM):');

    alert(`Event "${title}" scheduled for ${date} at ${time}`);
    // In a real app, you'd send this to your backend
  };

  const toggleStudyMode = () => {
    setStudyMode(!studyMode);
    if (!studyMode) {
      alert('🎯 Study Mode Enabled: Notifications muted');
    } else {
      alert('🔔 Study Mode Disabled: Notifications active');
    }
  };

  // Mobile sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Landing Page
  if (view === 'landing') {
    return (
      <div style={styles.landing}>
        <nav style={styles.nav}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>💬</span>
            CampusConnect
          </div>
          <div style={styles.navButtons}>
            <button onClick={() => setView('auth')} style={styles.btnSecondary}>
              Login
            </button>
            <button 
              onClick={() => { setView('auth'); setAuthMode('register'); }} 
              style={styles.btnPrimary}
            >
              Sign Up Free
            </button>
          </div>
        </nav>
        
        <main style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              Connect. Collaborate. <span style={styles.highlight}>Succeed.</span>
            </h1>
            <p style={styles.heroSubtitle}>
              The ultimate communication platform for students, clubs, and organizations. 
              Reduce useless notifications and focus on what matters.
            </p>

            <div style={{
              ...styles.statusBanner,
              ...(backendStatus === 'online' ? styles.statusOnline : styles.statusOffline)
            }}>
              <div style={styles.statusContent}>
                {backendStatus === 'online' ? '✅' : '❌'}
                {backendStatus === 'online' ? ' Backend Connected & Ready' : ' Backend Offline'}
              </div>
            </div>

            <div style={styles.heroButtons}>
              <button 
                onClick={() => { setView('auth'); setAuthMode('register'); }}
                style={styles.btnLargePrimary}
              >
                🚀 Get Started Free
              </button>
              <button 
                onClick={() => setView('auth')}
                style={styles.btnLargeSecondary}
              >
                🔐 Sign In
              </button>
            </div>
          </div>

          <div style={styles.featuresGrid}>
            {[
              { icon: '💬', title: 'Smart Messaging', desc: 'Real-time chat with threads, reactions, and file sharing' },
              { icon: '👥', title: 'Group Management', desc: 'Create clubs, organizations, and study groups with ease' },
              { icon: '📚', title: 'Study Mode', desc: 'Smart Do Not Disturb during study hours' },
              { icon: '📊', title: 'Polls & Surveys', desc: 'Make decisions together with built-in polling' },
              { icon: '📅', title: 'Event Planning', desc: 'Schedule events with automatic reminders' },
              { icon: '🔔', title: 'Smart Notifications', desc: 'AI-powered priority filtering' },
              { icon: '🔒', title: 'Secure & Private', desc: 'End-to-end encryption for private chats' },
              { icon: '📱', title: 'Mobile Friendly', desc: 'Works perfectly on all devices' }
            ].map((feature, i) => (
              <div key={i} style={styles.featureCard}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDesc}>{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div style={styles.statsSection}>
            <div style={styles.stat}>
              <div style={styles.statNumber}>100%</div>
              <div style={styles.statLabel}>Uptime</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statNumber}>0</div>
              <div style={styles.statLabel}>Useless Notifications</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statNumber}>∞</div>
              <div style={styles.statLabel}>Productivity</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Auth Page
  if (view === 'auth') {
    return (
      <div style={styles.authPage}>
        <div style={styles.authContainer}>
          <div style={styles.authCard}>
            <div style={styles.authHeader}>
              <button onClick={() => setView('landing')} style={styles.backButton}>
                ← Back to Home
              </button>
              <div style={styles.authLogo}>
                <span style={styles.logoIcon}>💬</span>
                CampusConnect
              </div>
              <h2 style={styles.authTitle}>
                {authMode === 'login' ? 'Welcome Back! 👋' : 'Join CampusConnect 🎉'}
              </h2>
              <p style={styles.authSubtitle}>
                {authMode === 'login' 
                  ? 'Sign in to continue your journey' 
                  : 'Create your account to get started'
                }
              </p>
            </div>

            <div style={styles.tabs}>
              <button
                onClick={() => setAuthMode('login')}
                style={{
                  ...styles.tab,
                  ...(authMode === 'login' && styles.tabActive)
                }}
              >
                🔐 Sign In
              </button>
              <button
                onClick={() => setAuthMode('register')}
                style={{
                  ...styles.tab,
                  ...(authMode === 'register' && styles.tabActive)
                }}
              >
                ✨ Create Account
              </button>
            </div>

            {message && (
              <div style={{
                ...styles.alert,
                ...(message.includes('Success') ? styles.alertSuccess : styles.alertError)
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
                placeholder="📧 Email Address"
                value={authForm.email}
                onChange={e => setAuthForm({...authForm, email: e.target.value})}
                style={styles.input}
                required
              />
              <input
                type="password"
                placeholder="🔒 Password (min. 6 characters)"
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
                {loading ? '⏳ Please Wait...' : 
                 authMode === 'login' ? '🔐 Sign In' : '🚀 Create Account'}
              </button>
            </form>

            <div style={styles.authFooter}>
              <p style={styles.authFooterText}>
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  style={styles.authSwitch}
                >
                  {authMode === 'login' ? 'Sign up here' : 'Sign in here'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard - Mobile & Desktop
  return (
    <div style={styles.dashboard}>
      {/* Mobile Header */}
      <div style={styles.mobileHeader}>
        <button onClick={toggleSidebar} style={styles.menuButton}>
          ☰
        </button>
        <div style={styles.mobileTitle}>
          {selectedGroup ? `#${selectedChannel}` : 'CampusConnect'}
        </div>
        <button onClick={toggleStudyMode} style={styles.studyModeButton}>
          {studyMode ? '📚' : '🔔'}
        </button>
      </div>

      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        ...(sidebarOpen && styles.sidebarOpen)
      }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>💬</span>
            CampusConnect
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>

        {/* User Profile */}
        <div style={styles.userSection}>
          <div style={styles.avatar}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.firstName} {user?.lastName}</div>
            <div style={styles.userEmail}>{user?.email}</div>
            <div style={styles.userStatus}>
              <span style={styles.statusIndicator}>●</span> Online
              {studyMode && <span style={styles.studyModeBadge}> 📚 Study Mode</span>}
            </div>
          </div>
        </div>

        {/* Groups Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>👥 Your Groups</h3>
            <button onClick={createGroup} style={styles.addButton}>
              ➕
            </button>
          </div>
          <div style={styles.groupsList}>
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                style={{
                  ...styles.groupItem,
                  ...(selectedGroup?.id === group.id && styles.groupItemActive)
                }}
              >
                <div style={styles.groupAvatar}>
                  {group.name[0].toUpperCase()}
                </div>
                <div style={styles.groupDetails}>
                  <div style={styles.groupName}>{group.name}</div>
                  <div style={styles.groupStats}>
                    {group.members?.length || 1} members • {group.analytics?.totalMessages || 0} messages
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <button onClick={createGroup} style={styles.quickAction}>
            👥 Create Group
          </button>
          <button onClick={toggleStudyMode} style={styles.quickAction}>
            {studyMode ? '🔔 Disable Study Mode' : '📚 Enable Study Mode'}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main style={styles.mainContent}>
        {selectedGroup ? (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div style={styles.channelInfo}>
                <h2 style={styles.channelName}>#{selectedChannel}</h2>
                <p style={styles.groupInfo}>
                  {selectedGroup.name} • {messages.length} messages
                  {typingUsers.length > 0 && (
                    <span style={styles.typingIndicator}>
                      • {typingUsers.map(u => u.firstName).join(', ')} typing...
                    </span>
                  )}
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
                <button onClick={createPoll} style={styles.chatAction}>
                  📊 Poll
                </button>
                <button onClick={scheduleEvent} style={styles.chatAction}>
                  📅 Event
                </button>
                <button style={styles.chatAction}>
                  📎 File
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>💬</div>
                  <h3>No messages yet</h3>
                  <p>Be the first to start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} style={{
                    ...styles.messageBubble,
                    ...(msg.sender?.id === user?.id && styles.ownMessage)
                  }}>
                    <div style={styles.messageHeader}>
                      <span style={styles.senderName}>
                        {msg.sender?.firstName || msg.sender?.name}
                        {msg.sender?.id === user?.id && ' (You)'}
                      </span>
                      <span style={styles.messageTime}>
                        {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={styles.messageContent}>
                      {msg.content?.text}
                      {msg.type === 'poll' && ' 📊 Poll: ' + (msg.metadata?.poll?.question || msg.content?.text)}
                    </div>
                    {msg.type === 'poll' && (
                      <div style={styles.pollActions}>
                        <button style={styles.pollOption}>Option 1</button>
                        <button style={styles.pollOption}>Option 2</button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} style={styles.messageForm}>
              <input
                value={newMessage}
                onChange={e => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onBlur={stopTyping}
                placeholder={`💭 Message #${selectedChannel}...`}
                style={styles.messageInput}
              />
              <button type="submit" style={styles.sendButton}>
                🚀
              </button>
            </form>
          </>
        ) : (
          <div style={styles.welcomeDashboard}>
            <div style={styles.welcomeContent}>
              <div style={styles.welcomeIcon}>💬</div>
              <h1 style={styles.welcomeTitle}>Welcome to CampusConnect, {user?.firstName}! 🎉</h1>
              <p style={styles.welcomeSubtitle}>
                Your student communication platform is ready. Create your first group and start collaborating!
              </p>
              
              <div style={styles.welcomeFeatures}>
                <div style={styles.welcomeFeature}>
                  <span style={styles.featureIcon}>👥</span>
                  <div>
                    <h4>Create Groups</h4>
                    <p>Start clubs, study groups, or organizations</p>
                  </div>
                </div>
                <div style={styles.welcomeFeature}>
                  <span style={styles.featureIcon}>💬</span>
                  <div>
                    <h4>Chat in Channels</h4>
                    <p>Organized conversations for different topics</p>
                  </div>
                </div>
                <div style={styles.welcomeFeature}>
                  <span style={styles.featureIcon}>📚</span>
                  <div>
                    <h4>Study Mode</h4>
                    <p>Focus without distractions</p>
                  </div>
                </div>
              </div>

              <button onClick={createGroup} style={styles.btnLargePrimary}>
                👥 Create Your First Group
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Complete Styles with Mobile Responsiveness
const styles = {
  // Global
  landing: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  // Navigation
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    '@media (max-width: 768px)': {
      padding: '1rem'
    }
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  logoIcon: {
    fontSize: '1.75rem'
  },
  navButtons: {
    display: 'flex',
    gap: '0.75rem',
    '@media (max-width: 768px)': {
      gap: '0.5rem'
    }
  },

  // Buttons
  btnPrimary: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    ':hover': {
      background: '#3730a3',
      transform: 'translateY(-1px)'
    }
  },
  btnSecondary: {
    background: 'transparent',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    ':hover': {
      background: 'rgba(255,255,255,0.1)',
      transform: 'translateY(-1px)'
    }
  },
  btnLargePrimary: {
    background: '#fbbf24',
    color: '#1f2937',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '1rem',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#f59e0b',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 25px rgba(251, 191, 36, 0.3)'
    }
  },
  btnLargeSecondary: {
    background: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '1rem 2rem',
    borderRadius: '1rem',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: 'rgba(255,255,255,0.1)',
      transform: 'translateY(-2px)'
    }
  },

  // Hero Section
  hero: {
    padding: '4rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    '@media (max-width: 768px)': {
      padding: '2rem 1rem'
    }
  },
  heroContent: {
    textAlign: 'center',
    marginBottom: '4rem'
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    lineHeight: '1.1',
    '@media (max-width: 768px)': {
      fontSize: '2.5rem'
    }
  },
  highlight: {
    color: '#fbbf24',
    textShadow: '0 2px 10px rgba(251, 191, 36, 0.3)'
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    marginBottom: '2rem',
    opacity: 0.9,
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto 2rem'
  },
  heroButtons: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    marginBottom: '3rem',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'center'
    }
  },

  // Status
  statusBanner: {
    padding: '1rem',
    borderRadius: '1rem',
    marginBottom: '2rem',
    fontWeight: '600',
    fontSize: '1rem',
    maxWidth: '400px',
    margin: '0 auto 2rem'
  },
  statusOnline: {
    background: 'rgba(34, 197, 94, 0.2)',
    border: '1px solid rgba(34, 197, 94, 0.3)'
  },
  statusOffline: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)'
  },
  statusContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    justifyContent: 'center'
  },

  // Features Grid
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    marginTop: '4rem'
  },
  featureCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '2rem',
    borderRadius: '1.5rem',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      background: 'rgba(255, 255, 255, 0.15)'
    }
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  featureDesc: {
    opacity: 0.9,
    lineHeight: '1.5'
  },

  // Stats
  statsSection: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4rem',
    marginTop: '4rem',
    padding: '2rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '1.5rem',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '2rem'
    }
  },
  stat: {
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#fbbf24'
  },
  statLabel: {
    fontSize: '1rem',
    opacity: 0.9
  },

  // Auth Page
  authPage: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  },
  authContainer: {
    width: '100%',
    maxWidth: '400px'
  },
  authCard: {
    background: 'white',
    borderRadius: '1.5rem',
    padding: '2.5rem',
    boxShadow: '0 25px 50px rgba(0,0,0,0.1)'
  },
  authHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  authLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: '1rem'
  },
  authTitle: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: '#1f2937'
  },
  authSubtitle: {
    color: '#6b7280',
    marginBottom: '0'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },

  // Tabs
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '2rem'
  },
  tab: {
    flex: 1,
    padding: '1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  tabActive: {
    borderBottomColor: '#4f46e5',
    color: '#4f46e5'
  },

  // Forms
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  nameFields: {
    display: 'flex',
    gap: '1rem',
    '@media (max-width: 768px)': {
      flexDirection: 'column'
    }
  },
  input: {
    padding: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#4f46e5',
      boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)'
    }
  },
  submitButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#3730a3',
      transform: 'translateY(-1px)'
    }
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    ':hover': {
      transform: 'none'
    }
  },

  // Alerts
  alert: {
    padding: '1rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    fontWeight: '500',
    textAlign: 'center'
  },
  alertSuccess: {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0'
  },
  alertError: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },

  // Auth Footer
  authFooter: {
    marginTop: '2rem',
    textAlign: 'center'
  },
  authFooterText: {
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  authSwitch: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontWeight: '500',
    ':hover': {
      textDecoration: 'underline'
    }
  },

  // Dashboard
  dashboard: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative'
  },

  // Mobile Header
  mobileHeader: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem',
      background: '#1f2937',
      color: 'white',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000
    }
  },
  menuButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer'
  },
  mobileTitle: {
    fontWeight: '600',
    fontSize: '1.125rem'
  },
  studyModeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.25rem',
    cursor: 'pointer'
  },

  // Sidebar
  sidebar: {
    width: '300px',
    background: '#1f2937',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    '@media (max-width: 768px)': {
      position: 'fixed',
      left: '-100%',
      top: '57px',
      bottom: 0,
      width: '85%',
      maxWidth: '300px',
      transition: 'left 0.3s ease',
      zIndex: 999
    }
  },
  sidebarOpen: {
    '@media (max-width: 768px)': {
      left: 0
    }
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #374151'
  },
  logoutButton: {
    background: 'transparent',
    color: 'white',
    border: '1px solid #6b7280',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    transition: 'all 0.2s',
    ':hover': {
      background: 'rgba(255,255,255,0.1)'
    }
  },

  // User Section
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    borderBottom: '1px solid #374151'
  },
  avatar: {
    width: '3rem',
    height: '3rem',
    background: '#4f46e5',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1rem',
    flexShrink: 0
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontWeight: '600',
    fontSize: '1rem',
    marginBottom: '0.25rem'
  },
  userEmail: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginBottom: '0.5rem'
  },
  userStatus: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  statusIndicator: {
    color: '#10b981'
  },
  studyModeBadge: {
    color: '#fbbf24'
  },

  // Sections
  section: {
    padding: '1.5rem',
    borderBottom: '1px solid #374151'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#d1d5db',
    margin: 0
  },
  addButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    width: '2rem',
    height: '2rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    transition: 'all 0.2s',
    ':hover': {
      background: '#3730a3'
    }
  },

  // Groups
  groupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  groupItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#374151'
    }
  },
  groupItemActive: {
    background: '#374151'
  },
  groupAvatar: {
    width: '2.5rem',
    height: '2.5rem',
    background: '#10b981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.875rem',
    flexShrink: 0
  },
  groupDetails: {
    flex: 1
  },
  groupName: {
    fontWeight: '500',
    fontSize: '0.875rem',
    marginBottom: '0.25rem'
  },
  groupStats: {
    fontSize: '0.75rem',
    color: '#9ca3af'
  },

  // Quick Actions
  quickActions: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  quickAction: {
    background: 'transparent',
    color: 'white',
    border: '1px solid #374151',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textAlign: 'left',
    transition: 'all 0.2s',
    ':hover': {
      background: '#374151'
    }
  },

  // Overlay
  overlay: {
    '@media (max-width: 768px)': {
      position: 'fixed',
      top: '57px',
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 998
    }
  },

  // Main Content
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#f9fafb',
    '@media (max-width: 768px)': {
      marginTop: '57px'
    }
  },

  // Chat Header
  chatHeader: {
    background: 'white',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '1rem',
      padding: '1rem'
    }
  },
  channelInfo: {
    flex: 1
  },
  channelName: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1f2937'
  },
  groupInfo: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  typingIndicator: {
    color: '#4f46e5',
    fontStyle: 'italic'
  },
  channelTabs: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  channelTab: {
    background: 'none',
    border: '1px solid #d1d5db',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    ':hover': {
      background: '#f3f4f6'
    }
  },
  channelTabActive: {
    background: '#4f46e5',
    color: 'white',
    borderColor: '#4f46e5',
    ':hover': {
      background: '#3730a3'
    }
  },
  chatActions: {
    display: 'flex',
    gap: '0.5rem',
    '@media (max-width: 768px)': {
      width: '100%',
      justifyContent: 'center'
    }
  },
  chatAction: {
    background: 'transparent',
    border: '1px solid #d1d5db',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    ':hover': {
      background: '#f3f4f6'
    }
  },

  // Messages
  messagesContainer: {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    '@media (max-width: 768px)': {
      padding: '1rem'
    }
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '3rem 1rem'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  messageBubble: {
    background: 'white',
    padding: '1rem',
    borderRadius: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxWidth: '70%',
    '@media (max-width: 768px)': {
      maxWidth: '85%'
    }
  },
  ownMessage: {
    background: '#4f46e5',
    color: 'white',
    marginLeft: 'auto'
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  senderName: {
    fontWeight: '600',
    fontSize: '0.875rem'
  },
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.7
  },
  messageContent: {
    lineHeight: '1.5'
  },
  pollActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem'
  },
  pollOption: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'all 0.2s',
    ':hover': {
      background: 'rgba(255,255,255,0.2)'
    }
  },

  // Message Input
  messageForm: {
    display: 'flex',
    padding: '1.5rem',
    background: 'white',
    borderTop: '1px solid #e5e7eb',
    gap: '1rem',
    '@media (max-width: 768px)': {
      padding: '1rem'
    }
  },
  messageInput: {
    flex: 1,
    padding: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '1rem',
    fontSize: '1rem',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#4f46e5',
      boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)'
    }
  },
  sendButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '1rem 1.5rem',
    borderRadius: '1rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'all 0.2s',
    ':hover': {
      background: '#3730a3',
      transform: 'translateY(-1px)'
    }
  },

  // Welcome Dashboard
  welcomeDashboard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    '@media (max-width: 768px)': {
      padding: '1rem'
    }
  },
  welcomeContent: {
    textAlign: 'center',
    maxWidth: '500px'
  },
  welcomeIcon: {
    fontSize: '5rem',
    marginBottom: '2rem'
  },
  welcomeTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: '#1f2937',
    '@media (max-width: 768px)': {
      fontSize: '2rem'
    }
  },
  welcomeSubtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
    marginBottom: '3rem',
    lineHeight: '1.6'
  },
  welcomeFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '3rem'
  },
  welcomeFeature: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'left'
  },
  featureIcon: {
    fontSize: '2rem',
    flexShrink: 0
  }
};

// Apply media queries
Object.keys(styles).forEach(key => {
  if (styles[key]['@media (max-width: 768px)']) {
    const mobileStyles = styles[key]['@media (max-width: 768px)'];
    delete styles[key]['@media (max-width: 768px)'];
    styles[key] = {
      ...styles[key],
      '@media (max-width: 768px)': mobileStyles
    };
  }
});
