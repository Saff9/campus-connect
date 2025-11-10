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
  const [activeTab, setActiveTab] = useState('home');
  const [studyMode, setStudyMode] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [threads, setThreads] = useState({});
  const [activeThread, setActiveThread] = useState(null);
  const [reactions, setReactions] = useState({});
  
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const [authForm, setAuthForm] = useState({ 
    firstName: '', lastName: '', email: '', password: '' 
  });

  // Group templates for quick creation
  const groupTemplates = [
    {
      name: 'Study Group',
      description: 'Collaborate on coursework and assignments',
      channels: ['general', 'homework', 'resources', 'study-sessions'],
      icon: '📚'
    },
    {
      name: 'Project Team', 
      description: 'Manage projects and tasks',
      channels: ['general', 'tasks', 'meetings', 'documentation'],
      icon: '🚀'
    },
    {
      name: 'Club',
      description: 'Organize events and discussions',
      channels: ['general', 'announcements', 'events', 'ideas'],
      icon: '👥'
    },
    {
      name: 'Course Discussion',
      description: 'Discuss lectures and materials',
      channels: ['general', 'lectures', 'assignments', 'qna'],
      icon: '💬'
    }
  ];

  // Check backend and auth status
  useEffect(() => {
    checkBackend();
    const token = localStorage.getItem('token');
    if (token) checkAuth(token);
  }, []);

  // Setup message polling
  useEffect(() => {
    if (user && selectedGroup && backendStatus === 'online') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      pollIntervalRef.current = setInterval(() => {
        loadMessages();
      }, 2000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user, selectedGroup, selectedChannel, backendStatus]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when group or channel changes
  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
    }
  }, [selectedGroup, selectedChannel]);

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
      } else {
        localStorage.removeItem('token');
      }
    } catch {
      localStorage.removeItem('token');
    }
  };

  const loadGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await fetch(`${API_URL}/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        if (data.groups?.length > 0 && !selectedGroup) {
          setSelectedGroup(data.groups[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      setGroups([]);
    }
  };

  const loadMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/messages/${selectedGroup.id}/${selectedChannel}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

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
        addNotification('success', `Welcome to CampusConnect, ${data.user.firstName}!`);
      } else {
        setMessage(data.message || 'Authentication failed');
        addNotification('error', data.message || 'Authentication failed');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      addNotification('error', 'Network error. Please try again.');
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
    setNotifications([]);
    setUnreadCount(0);
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  // NEW: Create group with template
  const createGroupWithTemplate = async (template) => {
    const name = prompt(`Enter ${template.name} name:`, `${template.name} ${Math.floor(Math.random() * 100)}`);
    if (!name) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          type: template.name.toLowerCase().replace(' ', '-'), 
          description: template.description,
          channels: template.channels 
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGroups(prev => [...prev, data.group]);
        setSelectedGroup(data.group);
        addNotification('success', `${template.icon} ${template.name} "${name}" created!`);
      } else {
        addNotification('error', 'Failed to create group');
      }
    } catch (error) {
      addNotification('error', 'Error creating group');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    try {
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
        setTypingUsers([]);
        setTimeout(() => loadMessages(), 100);
      } else {
        addNotification('error', 'Failed to send message');
      }
    } catch (error) {
      addNotification('error', 'Error sending message');
    }
  };

  // NEW: Threaded replies
  const startThread = (message) => {
    setActiveThread(message.id);
    setThreads(prev => ({
      ...prev,
      [message.id]: {
        parent: message,
        replies: []
      }
    }));
  };

  const sendThreadReply = async (threadId, replyText) => {
    if (!replyText.trim()) return;
    
    const newReply = {
      id: Date.now(),
      text: replyText,
      sender: user,
      timestamp: new Date()
    };

    setThreads(prev => ({
      ...prev,
      [threadId]: {
        ...prev[threadId],
        replies: [...(prev[threadId]?.replies || []), newReply]
      }
    }));

    addNotification('info', 'Reply sent to thread');
  };

  // NEW: Message reactions
  const addReaction = (messageId, reaction) => {
    setReactions(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [reaction]: (prev[messageId]?.[reaction] || 0) + 1
      }
    }));
  };

  // Simulate typing indicators
  const handleTyping = () => {
    if (Math.random() > 0.8) {
      const demoUsers = ['Alex', 'Taylor', 'Jordan', 'Casey'];
      const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
      setTypingUsers([{ id: 'temp', firstName: randomUser }]);
      
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.id !== 'temp'));
      }, 3000);
    }
  };

  const stopTyping = () => {
    setTimeout(() => {
      setTypingUsers([]);
    }, 1000);
  };

  const createPoll = async () => {
    const question = prompt('Poll question:');
    if (!question) return;
    
    const options = prompt('Options (comma separated):');
    if (!options) return;

    try {
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
        addNotification('success', 'Poll created successfully!');
      } else {
        addNotification('error', 'Failed to create poll');
      }
    } catch (error) {
      addNotification('error', 'Error creating poll');
    }
  };

  const scheduleEvent = async () => {
    const title = prompt('Event title:');
    if (!title) return;
    
    const date = prompt('Event date (YYYY-MM-DD):');
    const time = prompt('Event time (HH:MM):');

    if (date && time) {
      addNotification('success', `Event "${title}" scheduled for ${date} at ${time}`);
      alert(`Event "${title}" scheduled for ${date} at ${time}`);
    }
  };

  const toggleStudyMode = () => {
    setStudyMode(!studyMode);
    if (!studyMode) {
      addNotification('info', '🎯 Study Mode Enabled: Focus timer activated');
      setActiveTab('study');
    } else {
      addNotification('info', '🔔 Study Mode Disabled');
    }
  };

  // NEW: Notification system
  const addNotification = (type, text) => {
    const id = Date.now();
    const newNotification = { id, type, text, timestamp: new Date() };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    setUnreadCount(prev => prev + 1);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // NEW: Quick reactions
  const addQuickReaction = (reaction) => {
    if (!selectedGroup) return;
    setNewMessage(reaction + ' ');
  };

  // NEW: Search messages
  const filteredMessages = messages.filter(msg => 
    msg.content?.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.sender?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // NEW: Study Mode Features
  const [focusTimer, setFocusTimer] = useState(25 * 60); // 25 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sharedNotes, setSharedNotes] = useState('');

  useEffect(() => {
    let interval;
    if (isTimerRunning && focusTimer > 0) {
      interval = setInterval(() => {
        setFocusTimer(prev => prev - 1);
      }, 1000);
    } else if (focusTimer === 0) {
      addNotification('success', '🎉 Focus session complete! Take a break.');
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, focusTimer]);

  const startTimer = () => {
    setIsTimerRunning(true);
    addNotification('info', 'Focus timer started! 🎯');
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setFocusTimer(25 * 60);
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
              { icon: '💬', title: 'Threaded Messaging', desc: 'Organized conversations with threaded replies' },
              { icon: '👥', title: 'Smart Groups', desc: 'Templates for study groups, projects, and clubs' },
              { icon: '📚', title: 'Study Mode', desc: 'Focus timer and collaborative notes' },
              { icon: '📊', title: 'Polls & Events', desc: 'Make decisions and schedule together' },
              { icon: '🎯', title: 'Reactions', desc: 'Express with emojis and quick responses' },
              { icon: '🔍', title: 'Smart Search', desc: 'Find messages, files, and users instantly' }
            ].map((feature, i) => (
              <div key={i} style={styles.featureCard}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDesc}>{feature.desc}</p>
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

  // NEW: Top Navigation Component
  const TopNav = () => (
    <div style={styles.topNav}>
      <div style={styles.navLeft}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>💬</span>
          CampusConnect
        </div>
        
        <div style={styles.navTabs}>
          {[
            { id: 'home', label: '🏠 Home', icon: '🏠' },
            { id: 'groups', label: '👥 Groups', icon: '👥' },
            { id: 'channels', label: '💬 Channels', icon: '💬' },
            { id: 'study', label: '📚 Study Mode', icon: '📚' },
            { id: 'events', label: '📅 Events', icon: '📅' },
            { id: 'files', label: '📎 Files', icon: '📎' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'study') setStudyMode(true);
              }}
              style={{
                ...styles.navTab,
                ...(activeTab === tab.id && styles.navTabActive)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.navRight}>
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="🔍 Search messages, files, polls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.userSection}>
          <div style={styles.userAvatar}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.firstName} {user?.lastName}</div>
            <div style={styles.userStatus}>
              <span style={styles.statusIndicator}>●</span> 
              {studyMode ? 'Study Mode' : 'Online'}
            </div>
          </div>
          {unreadCount > 0 && (
            <button onClick={clearNotifications} style={styles.notificationBadge}>
              🔔 {unreadCount}
            </button>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪
          </button>
        </div>
      </div>
    </div>
  );

  // Dashboard - Redesigned Interface
  return (
    <div style={styles.dashboard}>
      {/* Notifications */}
      <div style={styles.notificationsContainer}>
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{
              ...styles.notification,
              ...styles[`notification${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]
            }}
          >
            {notification.text}
          </div>
        ))}
      </div>

      {/* Top Navigation */}
      <TopNav />

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Home Tab - Groups Dashboard */}
        {activeTab === 'home' && (
          <div style={styles.homeTab}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>👥 Your Groups</h2>
              <div style={styles.sectionActions}>
                <button style={styles.primaryBtn}>
                  ➕ Create Group
                </button>
              </div>
            </div>

            <div style={styles.groupsGrid}>
              {groups.map(group => (
                <div
                  key={group.id}
                  style={styles.groupCard}
                  onClick={() => {
                    setSelectedGroup(group);
                    setActiveTab('channels');
                  }}
                >
                  <div style={styles.groupCardHeader}>
                    <div style={styles.groupIcon}>
                      {group.name?.[0]?.toUpperCase() || 'G'}
                    </div>
                    <div style={styles.groupInfo}>
                      <h3 style={styles.groupName}>{group.name}</h3>
                      <p style={styles.groupStats}>
                        {group.members?.length || 1} members • {group.analytics?.totalMessages || 0} messages
                      </p>
                    </div>
                  </div>
                  <div style={styles.groupActions}>
                    <button style={styles.groupAction}>💬 Chat</button>
                    <button style={styles.groupAction}>📊 Poll</button>
                    <button style={styles.groupAction}>📅 Event</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.templatesSection}>
              <h3 style={styles.sectionTitle}>🎯 Quick Start Templates</h3>
              <div style={styles.templatesGrid}>
                {groupTemplates.map((template, index) => (
                  <div
                    key={index}
                    style={styles.templateCard}
                    onClick={() => createGroupWithTemplate(template)}
                  >
                    <div style={styles.templateIcon}>{template.icon}</div>
                    <h4 style={styles.templateName}>{template.name}</h4>
                    <p style={styles.templateDesc}>{template.description}</p>
                    <div style={styles.templateChannels}>
                      {template.channels.map((channel, i) => (
                        <span key={i} style={styles.channelTag}>#{channel}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && selectedGroup && (
          <div style={styles.channelsTab}>
            <div style={styles.channelLayout}>
              {/* Sidebar */}
              <aside style={styles.channelSidebar}>
                <div style={styles.sidebarSection}>
                  <h4 style={styles.sidebarTitle}>#{selectedGroup.name}</h4>
                  <div style={styles.channelList}>
                    {(selectedGroup.channels || ['general', 'announcements', 'random', 'homework', 'projects']).map(channel => (
                      <button
                        key={channel.name || channel}
                        onClick={() => setSelectedChannel(channel.name || channel)}
                        style={{
                          ...styles.channelItem,
                          ...(selectedChannel === (channel.name || channel) && styles.channelItemActive)
                        }}
                      >
                        # {channel.name || channel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Reactions */}
                <div style={styles.sidebarSection}>
                  <h4 style={styles.sidebarTitle}>Quick Reactions</h4>
                  <div style={styles.reactionsGrid}>
                    {['👍', '❤️', '😂', '🎉', '👀', '🚀'].map(reaction => (
                      <button
                        key={reaction}
                        onClick={() => addQuickReaction(reaction)}
                        style={styles.reactionBtn}
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Main Chat Area */}
              <div style={styles.chatArea}>
                <div style={styles.chatHeader}>
                  <h2 style={styles.channelName}>#{selectedChannel}</h2>
                  <p style={styles.channelInfo}>
                    {selectedGroup.name} • {messages.length} messages
                    {typingUsers.length > 0 && (
                      <span style={styles.typingIndicator}>
                        • {typingUsers.map(u => u.firstName).join(', ')} typing...
                      </span>
                    )}
                  </p>
                </div>

                {/* Messages */}
                <div style={styles.messagesContainer}>
                  {messages.length === 0 ? (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>💬</div>
                      <h3>No messages yet</h3>
                      <p>Be the first to start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={msg.id || index} style={styles.messageWrapper}>
                        <div style={{
                          ...styles.messageBubble,
                          ...(msg.sender?.id === user?.id && styles.ownMessage)
                        }}>
                          <div style={styles.messageHeader}>
                            <span style={styles.senderName}>
                              {msg.sender?.firstName || msg.sender?.name || 'Unknown User'}
                              {msg.sender?.id === user?.id && ' (You)'}
                            </span>
                            <span style={styles.messageTime}>
                              {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={styles.messageContent}>
                            {msg.content?.text || msg.text || 'No content'}
                          </div>
                          
                          {/* Reactions */}
                          <div style={styles.reactionsBar}>
                            {Object.entries(reactions[msg.id] || {}).map(([reaction, count]) => (
                              <button
                                key={reaction}
                                onClick={() => addReaction(msg.id, reaction)}
                                style={styles.reactionCount}
                              >
                                {reaction} {count}
                              </button>
                            ))}
                            <button
                              onClick={() => addReaction(msg.id, '👍')}
                              style={styles.addReaction}
                            >
                              +
                            </button>
                          </div>

                          {/* Thread Reply */}
                          <button
                            onClick={() => startThread(msg)}
                            style={styles.threadBtn}
                          >
                            💬 Reply
                          </button>
                        </div>

                        {/* Thread View */}
                        {activeThread === msg.id && (
                          <div style={styles.threadView}>
                            <div style={styles.threadReplies}>
                              {(threads[msg.id]?.replies || []).map(reply => (
                                <div key={reply.id} style={styles.threadReply}>
                                  <strong>{reply.sender.firstName}:</strong> {reply.text}
                                </div>
                              ))}
                            </div>
                            <div style={styles.threadInput}>
                              <input
                                type="text"
                                placeholder="Type your reply..."
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    sendThreadReply(msg.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                style={styles.threadInputField}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Post Tools */}
                <div style={styles.quickTools}>
                  <button onClick={createPoll} style={styles.quickTool}>
                    📊 Poll
                  </button>
                  <button onClick={scheduleEvent} style={styles.quickTool}>
                    📅 Event
                  </button>
                  <button style={styles.quickTool}>
                    📎 File
                  </button>
                  <button style={styles.quickTool}>
                    ❓ Quiz
                  </button>
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
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    style={{
                      ...styles.sendButton,
                      ...(!newMessage.trim() && styles.sendButtonDisabled)
                    }}
                  >
                    🚀
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Study Mode Tab */}
        {activeTab === 'study' && (
          <div style={styles.studyTab}>
            <div style={styles.studyHeader}>
              <h2>📚 Study Mode</h2>
              <p>Focus on your work without distractions</p>
            </div>

            <div style={styles.studyGrid}>
              {/* Focus Timer */}
              <div style={styles.studyCard}>
                <h3>🎯 Focus Timer</h3>
                <div style={styles.timerDisplay}>
                  {Math.floor(focusTimer / 60)}:{(focusTimer % 60).toString().padStart(2, '0')}
                </div>
                <div style={styles.timerControls}>
                  {!isTimerRunning ? (
                    <button onClick={startTimer} style={styles.timerBtn}>
                      ▶ Start
                    </button>
                  ) : (
                    <button onClick={pauseTimer} style={styles.timerBtn}>
                      ⏸ Pause
                    </button>
                  )}
                  <button onClick={resetTimer} style={styles.timerBtn}>
                    🔄 Reset
                  </button>
                </div>
              </div>

              {/* Shared Notes */}
              <div style={styles.studyCard}>
                <h3>📝 Shared Notes</h3>
                <textarea
                  value={sharedNotes}
                  onChange={(e) => setSharedNotes(e.target.value)}
                  placeholder="Collaborate on notes with your study group..."
                  style={styles.notesInput}
                />
                <div style={styles.notesActions}>
                  <button style={styles.notesBtn}>💾 Save</button>
                  <button style={styles.notesBtn}>📤 Share</button>
                </div>
              </div>

              {/* AI Helper */}
              <div style={styles.studyCard}>
                <h3>🤖 AI Study Helper</h3>
                <div style={styles.aiActions}>
                  <button style={styles.aiBtn}>📖 Summarize</button>
                  <button style={styles.aiBtn}>❓ Generate Quiz</button>
                  <button style={styles.aiBtn}>💡 Explain Concept</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome State */}
        {activeTab === 'home' && groups.length === 0 && (
          <div style={styles.welcomeState}>
            <div style={styles.welcomeContent}>
              <div style={styles.welcomeIcon}>🎉</div>
              <h1>Welcome to CampusConnect, {user?.firstName}!</h1>
              <p>Get started by creating your first group or using a template</p>
              
              <div style={styles.welcomeActions}>
                <button 
                  onClick={() => createGroupWithTemplate(groupTemplates[0])}
                  style={styles.welcomeBtn}
                >
                  📚 Create Study Group
                </button>
                <button 
                  onClick={() => setActiveTab('study')}
                  style={styles.welcomeBtn}
                >
                  🎯 Try Study Mode
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// COMPLETE STYLES FOR REDESIGNED INTERFACE
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
    margin: '0 auto'
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
    gap: '0.75rem'
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
    transition: 'all 0.2s'
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
    transition: 'all 0.2s'
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
    transition: 'all 0.2s'
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
    transition: 'all 0.2s'
  },

  // Hero Section
  hero: {
    padding: '4rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  heroContent: {
    textAlign: 'center',
    marginBottom: '4rem'
  },
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    lineHeight: '1.1'
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
    marginBottom: '3rem'
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
    transition: 'all 0.3s ease'
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  nameFields: {
    display: 'flex',
    gap: '1rem'
  },
  input: {
    padding: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.2s'
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
    transition: 'all 0.2s'
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
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
    fontWeight: '500'
  },

  // Dashboard
  dashboard: {
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f8fafc'
  },

  // Top Navigation
  topNav: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  navTabs: {
    display: 'flex',
    gap: '0.5rem'
  },
  navTab: {
    background: 'none',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  navTabActive: {
    background: '#4f46e5',
    color: 'white'
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  searchBar: {
    position: 'relative'
  },
  searchInput: {
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    width: '300px',
    background: '#f9fafb'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  userAvatar: {
    width: '2.5rem',
    height: '2.5rem',
    background: '#4f46e5',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: 'white',
    fontSize: '0.875rem'
  },
  userInfo: {
    textAlign: 'right'
  },
  userName: {
    fontWeight: '600',
    fontSize: '0.875rem'
  },
  userStatus: {
    fontSize: '0.75rem',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  statusIndicator: {
    color: '#10b981',
    fontSize: '0.5rem'
  },
  notificationBadge: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '1.5rem',
    height: '1.5rem',
    fontSize: '0.75rem',
    cursor: 'pointer'
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.5rem'
  },

  // Main Content
  mainContent: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },

  // Home Tab
  homeTab: {
    
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  sectionActions: {
    display: 'flex',
    gap: '1rem'
  },
  primaryBtn: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontWeight: '600'
  },
  groupsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem'
  },
  groupCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '1rem',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  groupCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  groupIcon: {
    width: '3rem',
    height: '3rem',
    background: '#4f46e5',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: 'white',
    fontSize: '1.25rem'
  },
  groupInfo: {
    flex: 1
  },
  groupName: {
    fontWeight: '600',
    fontSize: '1.125rem',
    marginBottom: '0.25rem'
  },
  groupStats: {
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  groupActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  groupAction: {
    background: '#f3f4f6',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer'
  },

  // Templates
  templatesSection: {
    marginTop: '3rem'
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  templateCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '1rem',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  templateIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  templateName: {
    fontWeight: '600',
    fontSize: '1.125rem',
    marginBottom: '0.5rem'
  },
  templateDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem'
  },
  templateChannels: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.25rem',
    justifyContent: 'center'
  },
  channelTag: {
    background: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    color: '#6b7280'
  },

  // Channels Tab
  channelsTab: {
    
  },
  channelLayout: {
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    gap: '2rem',
    height: '70vh'
  },
  channelSidebar: {
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid #e5e7eb'
  },
  sidebarSection: {
    marginBottom: '2rem'
  },
  sidebarTitle: {
    fontWeight: '600',
    fontSize: '0.875rem',
    color: '#374151',
    marginBottom: '1rem'
  },
  channelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  channelItem: {
    background: 'none',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.875rem',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  channelItemActive: {
    background: '#4f46e5',
    color: 'white'
  },
  reactionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem'
  },
  reactionBtn: {
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.5rem',
    cursor: 'pointer',
    fontSize: '1.25rem',
    transition: 'all 0.2s'
  },

  // Chat Area
  chatArea: {
    background: 'white',
    borderRadius: '1rem',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column'
  },
  chatHeader: {
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  channelName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem'
  },
  channelInfo: {
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  typingIndicator: {
    color: '#4f46e5',
    fontStyle: 'italic'
  },
  messagesContainer: {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  messageWrapper: {
    
  },
  messageBubble: {
    background: '#f3f4f6',
    padding: '1rem',
    borderRadius: '1rem',
    maxWidth: '70%'
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
  reactionsBar: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
    alignItems: 'center'
  },
  reactionCount: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '1rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    cursor: 'pointer'
  },
  addReaction: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '50%',
    width: '1.5rem',
    height: '1.5rem',
    cursor: 'pointer',
    fontSize: '0.75rem'
  },
  threadBtn: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '0.75rem',
    cursor: 'pointer',
    opacity: 0.7,
    marginTop: '0.5rem'
  },
  threadView: {
    marginLeft: '2rem',
    marginTop: '0.5rem',
    borderLeft: '2px solid #e5e7eb',
    paddingLeft: '1rem'
  },
  threadReplies: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  threadReply: {
    fontSize: '0.875rem',
    padding: '0.5rem',
    background: '#f9fafb',
    borderRadius: '0.5rem'
  },
  threadInput: {
    display: 'flex',
    gap: '0.5rem'
  },
  threadInputField: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem'
  },

  // Quick Tools
  quickTools: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  quickTool: {
    background: '#f3f4f6',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },

  // Message Input
  messageForm: {
    display: 'flex',
    padding: '1.5rem',
    gap: '1rem'
  },
  messageInput: {
    flex: 1,
    padding: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '1rem',
    fontSize: '1rem'
  },
  sendButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '1rem 1.5rem',
    borderRadius: '1rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem'
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },

  // Study Mode
  studyTab: {
    
  },
  studyHeader: {
    textAlign: 'center',
    marginBottom: '3rem'
  },
  studyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem'
  },
  studyCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '1rem',
    padding: '2rem',
    textAlign: 'center'
  },
  timerDisplay: {
    fontSize: '3rem',
    fontWeight: 'bold',
    margin: '1.5rem 0',
    color: '#4f46e5'
  },
  timerControls: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center'
  },
  timerBtn: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    cursor: 'pointer'
  },
  notesInput: {
    width: '100%',
    height: '200px',
    padding: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.75rem',
    margin: '1rem 0',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  notesActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center'
  },
  notesBtn: {
    background: '#f3f4f6',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    cursor: 'pointer'
  },
  aiActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  aiBtn: {
    background: '#f3f4f6',
    border: 'none',
    padding: '1rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },

  // Welcome State
  welcomeState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh'
  },
  welcomeContent: {
    textAlign: 'center',
    maxWidth: '500px'
  },
  welcomeIcon: {
    fontSize: '4rem',
    marginBottom: '1.5rem'
  },
  welcomeActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginTop: '2rem'
  },
  welcomeBtn: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '1rem 1.5rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontWeight: '600'
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '3rem 1rem'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },

  // Notifications
  notificationsContainer: {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  notification: {
    padding: '1rem',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    fontWeight: '500',
    maxWidth: '300px',
    animation: 'slideIn 0.3s ease-out'
  },
  notificationSuccess: {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0'
  },
  notificationError: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  notificationInfo: {
    background: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #93c5fd'
  }
};

// Add CSS animation for notifications
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}
