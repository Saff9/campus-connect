import { useState, useEffect, useRef } from 'react';

const API_URL = 'https://campus-connect-f2it.onrender.com/api';

export default function CampusConnect() {
  const [view, setView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileEdit, setProfileEdit] = useState(false);
  const [userProfile, setUserProfile] = useState({
    bio: '',
    major: '',
    year: '',
    interests: []
  });
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [authForm, setAuthForm] = useState({ 
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '' 
  });

  // Demo data for fallback
  const demoUsers = [
    {
      id: 1,
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex@campus.edu',
      bio: 'Computer Science major passionate about AI and machine learning',
      major: 'Computer Science',
      year: 'Junior',
      interests: ['Programming', 'AI', 'Basketball', 'Music'],
      avatar: '👨‍💻',
      online: true
    },
    {
      id: 2,
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah@campus.edu',
      bio: 'Biology student researching environmental science',
      major: 'Biology',
      year: 'Senior',
      interests: ['Research', 'Hiking', 'Photography', 'Sustainability'],
      avatar: '👩‍🔬',
      online: true
    }
  ];

  // Check backend status on component mount
  useEffect(() => {
    checkBackend();
    const token = localStorage.getItem('token');
    if (token) checkAuth(token);
  }, []);

  // Setup polling for messages when chat is active
  useEffect(() => {
    if (user && activeChat && backendStatus === 'online') {
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
  }, [user, activeChat, backendStatus]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        setBackendStatus('online');
        console.log('✅ Backend is online and connected');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      setBackendStatus('offline');
      console.log('❌ Backend is offline, using demo mode');
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
        loadInitialData();
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      localStorage.removeItem('token');
      setBackendStatus('offline');
    }
  };

  const loadInitialData = async () => {
    if (backendStatus === 'online') {
      await Promise.all([loadUsers(), loadFriends(), loadFriendRequests()]);
    } else {
      // Initialize demo data
      setUsers(demoUsers);
      setDiscoverUsers(demoUsers.filter(u => u.id !== 0));
      setFriends(demoUsers.slice(0, 2));
      setFriendRequests([]);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setDiscoverUsers(data.users?.filter(u => u.id !== user?.id) || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  };

  const loadMessages = async () => {
    if (!activeChat) return;
    
    if (backendStatus === 'online') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/messages/${activeChat.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
      setMessage("Passwords don't match!");
      setLoading(false);
      return;
    }

    // Try backend first
    if (backendStatus === 'online') {
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
          loadInitialData();
          setMessage('Success! Welcome to CampusConnect 🎉');
          addNotification('success', `Welcome to CampusConnect, ${data.user.firstName}!`);
        } else {
          setMessage(data.message || 'Authentication failed');
          addNotification('error', data.message || 'Authentication failed');
        }
      } catch (error) {
        // Fallback to demo mode if backend fails
        useDemoAuth();
      }
    } else {
      // Use demo mode directly
      useDemoAuth();
    }
    
    setLoading(false);
  };

  const useDemoAuth = () => {
    const demoUser = {
      id: 0,
      firstName: authForm.firstName || 'Demo',
      lastName: authForm.lastName || 'User',
      email: authForm.email || 'demo@campus.edu',
      bio: 'Welcome to CampusConnect! Start connecting with students worldwide.',
      major: 'Exploring Majors',
      year: 'Freshman',
      interests: ['Meeting New People', 'Learning', 'Campus Life'],
      avatar: '😊'
    };

    setUser(demoUser);
    setView('dashboard');
    loadInitialData();
    
    const welcomeMsg = authMode === 'login' 
      ? `Welcome back, ${demoUser.firstName}! (Demo Mode)` 
      : `Welcome to CampusConnect, ${demoUser.firstName}! 🎉 (Demo Mode)`;
    
    setMessage(welcomeMsg);
    addNotification('success', welcomeMsg);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('landing');
    setUsers([]);
    setFriends([]);
    setFriendRequests([]);
    setMessages([]);
    setActiveChat(null);
    setNotifications([]);
    setUnreadCount(0);
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  const sendFriendRequest = async (toUser) => {
    if (backendStatus === 'online') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/friends/request`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ toUserId: toUser.id })
        });

        if (res.ok) {
          addNotification('success', `Friend request sent to ${toUser.firstName}!`);
          setDiscoverUsers(prev => prev.filter(u => u.id !== toUser.id));
        } else {
          addNotification('error', 'Failed to send friend request');
        }
      } catch (error) {
        addNotification('error', 'Error sending friend request');
      }
    } else {
      // Demo mode
      addNotification('success', `Friend request sent to ${toUser.firstName}! (Demo)`);
      setDiscoverUsers(prev => prev.filter(u => u.id !== toUser.id));
    }
  };

  const acceptFriendRequest = async (request) => {
    if (backendStatus === 'online') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/friends/accept`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ requestId: request.id })
        });

        if (res.ok) {
          addNotification('success', `You are now friends with ${request.from.firstName}!`);
          setFriends(prev => [...prev, request.from]);
          setFriendRequests(prev => prev.filter(r => r.id !== request.id));
        } else {
          addNotification('error', 'Failed to accept friend request');
        }
      } catch (error) {
        addNotification('error', 'Error accepting friend request');
      }
    } else {
      // Demo mode
      addNotification('success', `You are now friends with ${request.from.firstName}! (Demo)`);
      setFriends(prev => [...prev, request.from]);
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const newMsg = {
      id: Date.now(),
      senderId: user.id,
      text: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');
    setIsTyping(false);

    if (backendStatus === 'online') {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/messages/send`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            toUserId: activeChat.id,
            content: newMessage
          })
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  // Enhanced notification system
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

  const startChat = (user) => {
    setActiveChat(user);
    loadMessages();
  };

  const filteredUsers = users.filter(u =>
    u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.major.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.interests.some(interest => interest.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredFriends = friends.filter(f =>
    f.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Landing Page
  if (view === 'landing') {
    return (
      <div style={styles.landing}>
        <div style={styles.animatedBackground}></div>
        
        <nav style={styles.nav}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>💬</span>
            <span style={styles.logoText}>CampusConnect</span>
          </div>
          <div style={styles.navButtons}>
            <button 
              onClick={() => setView('auth')}
              style={styles.navButton}
            >
              Login
            </button>
            <button 
              onClick={() => { setView('auth'); setAuthMode('register'); }}
              style={{...styles.navButton, ...styles.primaryNavButton}}
            >
              Join Free
            </button>
          </div>
        </nav>
        
        <main style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.heroBadge}>
              🎓 Connect with Students Worldwide
            </div>
            <h1 style={styles.heroTitle}>
              Find Your <span style={styles.gradientText}>Campus Tribe</span>
            </h1>
            <p style={styles.heroSubtitle}>
              The ultimate platform for students to connect, collaborate, and build meaningful relationships. 
              Join thousands of students making friends and networking.
            </p>

            <div style={{
              ...styles.statusBanner,
              ...(backendStatus === 'online' ? styles.statusOnline : styles.statusOffline)
            }}>
              <div style={styles.statusContent}>
                {backendStatus === 'online' ? '✅' : '🔄'}
                {backendStatus === 'online' ? ' Live & Connected' : ' Demo Mode'}
                {backendStatus === 'online' && (
                  <div style={styles.backendInfo}>
                    Backend API: Operational
                  </div>
                )}
              </div>
            </div>

            <div style={styles.heroButtons}>
              <button 
                onClick={() => { setView('auth'); setAuthMode('register'); }}
                style={styles.ctaButton}
              >
                <span style={styles.buttonIcon}>🚀</span>
                Start Connecting Free
              </button>
              <button 
                onClick={() => setView('auth')}
                style={styles.secondaryCtaButton}
              >
                <span style={styles.buttonIcon}>👥</span>
                Join Community
              </button>
            </div>

            <div style={styles.heroStats}>
              <div style={styles.stat}>
                <div style={styles.statNumber}>10K+</div>
                <div style={styles.statLabel}>Active Students</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statNumber}>50K+</div>
                <div style={styles.statLabel}>Connections Made</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statNumber}>100+</div>
                <div style={styles.statLabel}>Campuses</div>
              </div>
            </div>
          </div>

          <div style={styles.featuresShowcase}>
            {[
              {
                icon: '🤝',
                title: 'Instant Connections',
                description: 'Find and connect with students who share your interests and goals'
              },
              {
                icon: '💬',
                title: 'Real Chat',
                description: 'Message friends instantly with real-time chat system'
              },
              {
                icon: '🎯',
                title: 'Smart Matching',
                description: 'Get matched with compatible students based on your profile'
              },
              {
                icon: '🔒',
                title: 'Safe & Secure',
                description: 'Campus-verified profiles ensure a safe environment'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                style={{
                  ...styles.featureCard,
                  animationDelay: `${index * 0.2}s`
                }}
                className="feature-card"
              >
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDesc}>{feature.description}</p>
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
        <div style={styles.authBackground}></div>
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
                  ? 'Sign in to connect with your campus community' 
                  : 'Create your account and start making connections'
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
                placeholder="📧 Campus Email"
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
              {authMode === 'register' && (
                <input
                  type="password"
                  placeholder="🔒 Confirm Password"
                  value={authForm.confirmPassword}
                  onChange={e => setAuthForm({...authForm, confirmPassword: e.target.value})}
                  style={styles.input}
                  required
                />
              )}
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  ...(loading && styles.submitButtonDisabled)
                }}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner}></span>
                    {backendStatus === 'online' ? 'Connecting...' : 'Setting up Demo...'}
                  </>
                ) : (
                  <>
                    {authMode === 'login' ? '🔐 Sign In' : '🚀 Create Account'}
                  </>
                )}
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
              <div style={styles.backendStatus}>
                {backendStatus === 'online' ? '✅ Connected to Live API' : '🔄 Using Demo Mode'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={styles.dashboard}>
      {/* Notifications */}
      <div style={styles.notificationsContainer}>
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{
              ...styles.notification,
              ...styles[`notification${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`],
              animationDelay: `${index * 0.1}s`
            }}
            className="slide-in"
          >
            {notification.text}
          </div>
        ))}
      </div>

      {/* Top Navigation */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>💬</span>
            CampusConnect
          </div>
          <div style={styles.backendIndicator}>
            {backendStatus === 'online' ? '🟢 Live' : '🟡 Demo'}
          </div>
        </div>

        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="🔍 Search friends, interests, majors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.headerRight}>
          <button 
            onClick={clearNotifications}
            style={styles.notificationButton}
          >
            🔔
            {unreadCount > 0 && (
              <span style={styles.notificationDot}>{unreadCount}</span>
            )}
          </button>
          <div style={styles.userMenu}>
            <div style={styles.userAvatar}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={styles.sidebarNav}>
            {[
              { id: 'discover', icon: '🔍', label: 'Discover', count: discoverUsers.length },
              { id: 'friends', icon: '👥', label: 'Friends', count: friends.length },
              { id: 'requests', icon: '📥', label: 'Requests', count: friendRequests.length }
            ].map(item => (
              <button
                key={item.id}
                style={{
                  ...styles.navItem,
                  ...(activeChat === item.id && styles.navItemActive)
                }}
                onClick={() => setActiveChat(item.id)}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span style={styles.navLabel}>{item.label}</span>
                {item.count > 0 && (
                  <span style={styles.navBadge}>{item.count}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <button style={styles.quickAction}>
              🎯 Find Study Partners
            </button>
            <button style={styles.quickAction}>
              🌟 Join Communities
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div style={styles.content}>
          {/* Discover Page */}
          {activeChat === 'discover' && (
            <div style={styles.page}>
              <div style={styles.pageHeader}>
                <h2 style={styles.pageTitle}>Discover Students</h2>
                <p style={styles.pageSubtitle}>
                  Connect with students who share your interests
                  {backendStatus === 'online' && ' • Live Network'}
                </p>
              </div>

              <div style={styles.usersGrid}>
                {discoverUsers.map(user => (
                  <div key={user.id} style={styles.userCard}>
                    <div style={styles.userCardHeader}>
                      <div style={styles.userAvatarLarge}>
                        {user.avatar}
                      </div>
                      <div style={styles.userInfo}>
                        <h3 style={styles.userName}>{user.firstName} {user.lastName}</h3>
                        <p style={styles.userMajor}>{user.major} • {user.year}</p>
                        <p style={styles.userBio}>{user.bio}</p>
                      </div>
                    </div>
                    
                    <div style={styles.interests}>
                      {user.interests.map((interest, index) => (
                        <span key={index} style={styles.interestTag}>#{interest}</span>
                      ))}
                    </div>

                    <button
                      onClick={() => sendFriendRequest(user)}
                      style={styles.connectButton}
                    >
                      🤝 Send Friend Request
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends Page */}
          {activeChat === 'friends' && (
            <div style={styles.page}>
              <div style={styles.pageHeader}>
                <h2 style={styles.pageTitle}>Your Friends</h2>
                <p style={styles.pageSubtitle}>
                  {friends.length} connections
                  {backendStatus === 'online' && ' • Live Network'}
                </p>
              </div>

              <div style={styles.friendsList}>
                {filteredFriends.map(friend => (
                  <div
                    key={friend.id}
                    style={styles.friendItem}
                    onClick={() => startChat(friend)}
                  >
                    <div style={styles.friendAvatar}>
                      {friend.avatar}
                    </div>
                    <div style={styles.friendInfo}>
                      <h4 style={styles.friendName}>{friend.firstName} {friend.lastName}</h4>
                      <p style={styles.friendDetails}>{friend.major} • {friend.year}</p>
                      <div style={styles.friendInterests}>
                        {friend.interests.slice(0, 3).map((interest, index) => (
                          <span key={index} style={styles.friendInterest}>#{interest}</span>
                        ))}
                      </div>
                    </div>
                    <button style={styles.chatButton}>
                      💬 Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friend Requests Page */}
          {activeChat === 'requests' && (
            <div style={styles.page}>
              <div style={styles.pageHeader}>
                <h2 style={styles.pageTitle}>Friend Requests</h2>
                <p style={styles.pageSubtitle}>
                  {friendRequests.length} pending requests
                </p>
              </div>

              <div style={styles.requestsList}>
                {friendRequests.map(request => (
                  <div key={request.id} style={styles.requestCard}>
                    <div style={styles.requestHeader}>
                      <div style={styles.requestAvatar}>
                        {request.from.avatar}
                      </div>
                      <div style={styles.requestInfo}>
                        <h4 style={styles.requestName}>{request.from.firstName} {request.from.lastName}</h4>
                        <p style={styles.requestDetails}>{request.from.major} • {request.from.year}</p>
                        <p style={styles.requestTime}>
                          {new Date(request.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div style={styles.requestActions}>
                      <button
                        onClick={() => acceptFriendRequest(request)}
                        style={styles.acceptButton}
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => setFriendRequests(prev => prev.filter(r => r.id !== request.id))}
                        style={styles.rejectButton}
                      >
                        ✗ Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Interface */}
          {activeChat && typeof activeChat === 'object' && (
            <div style={styles.chatContainer}>
              <div style={styles.chatHeader}>
                <div style={styles.chatUser}>
                  <div style={styles.chatAvatar}>
                    {activeChat.avatar}
                  </div>
                  <div>
                    <h3 style={styles.chatUserName}>{activeChat.firstName} {activeChat.lastName}</h3>
                    <p style={styles.chatUserStatus}>
                      {activeChat.major} • {backendStatus === 'online' ? 'Live Chat' : 'Demo Chat'}
                    </p>
                  </div>
                </div>
              </div>

              <div style={styles.messagesContainer}>
                {messages.length === 0 ? (
                  <div style={styles.emptyChat}>
                    <div style={styles.emptyChatIcon}>💬</div>
                    <h3>No messages yet</h3>
                    <p>Send a message to start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.message,
                        ...(msg.senderId === user.id ? styles.ownMessage : styles.otherMessage)
                      }}
                      className="message-fade-in"
                    >
                      <div style={styles.messageContent}>
                        {msg.text}
                      </div>
                      <div style={styles.messageTime}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} style={styles.messageForm}>
                <div style={styles.messageInputContainer}>
                  <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
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
                </div>
              </form>
            </div>
          )}

          {/* Welcome State */}
          {!activeChat && (
            <div style={styles.welcome}>
              <div style={styles.welcomeContent}>
                <div style={styles.welcomeIcon}>👋</div>
                <h2 style={styles.welcomeTitle}>Welcome, {user?.firstName}!</h2>
                <p style={styles.welcomeSubtitle}>
                  {backendStatus === 'online' 
                    ? 'You are connected to the live network! Start connecting with other students.'
                    : 'You are in demo mode. All features work with sample data.'
                  }
                </p>
                
                <div style={styles.welcomeStats}>
                  <div style={styles.welcomeStat}>
                    <div style={styles.statNumber}>{friends.length}</div>
                    <div style={styles.statLabel}>Friends</div>
                  </div>
                  <div style={styles.welcomeStat}>
                    <div style={styles.statNumber}>{discoverUsers.length}</div>
                    <div style={styles.statLabel}>New Connections</div>
                  </div>
                  <div style={styles.welcomeStat}>
                    <div style={styles.statNumber}>{friendRequests.length}</div>
                    <div style={styles.statLabel}>Pending</div>
                  </div>
                </div>

                <div style={styles.welcomeActions}>
                  <button 
                    onClick={() => setActiveChat('discover')}
                    style={styles.welcomeAction}
                  >
                    🔍 Discover Students
                  </button>
                  <button 
                    onClick={() => setActiveChat('friends')}
                    style={styles.welcomeAction}
                  >
                    👥 View Friends
                  </button>
                </div>

                {backendStatus === 'online' && (
                  <div style={styles.liveIndicator}>
                    ✅ Connected to Live Backend API
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Styles remain the same as previous implementation
const styles = {
  // ... (ALL THE STYLES FROM PREVIOUS IMPLEMENTATION)
  landing: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, #667eea 0%, #764ba2 50%, #764ba2 100%)',
    animation: 'gradientShift 8s ease infinite',
    backgroundSize: '400% 400%'
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 10
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1.75rem',
    fontWeight: 'bold'
  },
  logoIcon: {
    fontSize: '2rem',
    animation: 'bounce 2s infinite'
  },
  logoText: {
    background: 'linear-gradient(45deg, #fff, #fbbf24)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    fontWeight: 'bold'
  },
  navButtons: {
    display: 'flex',
    gap: '1rem'
  },
  navButton: {
    background: 'transparent',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.3)',
    padding: '0.75rem 1.5rem',
    borderRadius: '2rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.3s ease'
  },
  primaryNavButton: {
    background: '#fbbf24',
    color: '#1f2937',
    border: 'none',
    boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
  },
  hero: {
    padding: '4rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 10
  },
  heroContent: {
    textAlign: 'center',
    marginBottom: '6rem'
  },
  heroBadge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    padding: '0.75rem 1.5rem',
    borderRadius: '2rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '2rem',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  heroTitle: {
    fontSize: '4rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    lineHeight: '1.1'
  },
  gradientText: {
    background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent'
  },
  heroSubtitle: {
    fontSize: '1.375rem',
    marginBottom: '3rem',
    opacity: 0.9,
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto 3rem'
  },
  statusBanner: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    padding: '1rem 2rem',
    borderRadius: '1rem',
    marginBottom: '3rem',
    border: '1px solid rgba(255,255,255,0.2)',
    maxWidth: '400px',
    margin: '0 auto 3rem'
  },
  statusOnline: {
    background: 'rgba(34, 197, 94, 0.2)',
    border: '1px solid rgba(34, 197, 94, 0.3)'
  },
  statusOffline: {
    background: 'rgba(251, 191, 36, 0.2)',
    border: '1px solid rgba(251, 191, 36, 0.3)'
  },
  statusContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    justifyContent: 'center',
    fontWeight: '600'
  },
  backendInfo: {
    fontSize: '0.75rem',
    opacity: 0.8,
    marginTop: '0.5rem'
  },
  heroButtons: {
    display: 'flex',
    gap: '1.5rem',
    justifyContent: 'center',
    marginBottom: '4rem',
    flexWrap: 'wrap'
  },
  ctaButton: {
    background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
    color: '#1f2937',
    border: 'none',
    padding: '1.25rem 2.5rem',
    borderRadius: '2rem',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(251, 191, 36, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  secondaryCtaButton: {
    background: 'transparent',
    color: 'white',
    border: '2px solid rgba(255,255,255,0.3)',
    padding: '1.25rem 2.5rem',
    borderRadius: '2rem',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  buttonIcon: {
    fontSize: '1.25rem'
  },
  heroStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4rem',
    marginTop: '4rem'
  },
  stat: {
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: '0.5rem'
  },
  statLabel: {
    fontSize: '1rem',
    opacity: 0.9
  },
  featuresShowcase: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem',
    marginTop: '4rem'
  },
  featureCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '2.5rem 2rem',
    borderRadius: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    opacity: 0,
    animation: 'slideUp 0.6s ease forwards'
  },
  featureIcon: {
    fontSize: '3.5rem',
    marginBottom: '1.5rem'
  },
  featureTitle: {
    fontSize: '1.375rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  featureDesc: {
    opacity: 0.9,
    lineHeight: '1.6',
    fontSize: '1rem'
  },
  authPage: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    position: 'relative'
  },
  authBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, #667eea 0%, #764ba2 50%, #764ba2 100%)',
    animation: 'gradientShift 8s ease infinite',
    backgroundSize: '400% 400%'
  },
  authContainer: {
    width: '100%',
    maxWidth: '450px',
    position: 'relative',
    zIndex: 10
  },
  authCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '2rem',
    padding: '3rem',
    boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.3)'
  },
  authHeader: {
    textAlign: 'center',
    marginBottom: '2.5rem'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  authLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#4f46e5',
    marginBottom: '1.5rem'
  },
  authTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
    color: '#1f2937'
  },
  authSubtitle: {
    color: '#6b7280',
    fontSize: '1.125rem'
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    marginBottom: '2.5rem'
  },
  tab: {
    flex: 1,
    padding: '1.25rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.3s ease'
  },
  tabActive: {
    borderBottomColor: '#4f46e5',
    color: '#4f46e5'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  nameFields: {
    display: 'flex',
    gap: '1rem'
  },
  input: {
    padding: '1.25rem',
    border: '2px solid #e5e7eb',
    borderRadius: '1rem',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
    background: 'white'
  },
  submitButton: {
    background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '1.25rem',
    borderRadius: '1rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    boxShadow: '0 8px 25px rgba(79, 70, 229, 0.3)'
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  spinner: {
    width: '1.25rem',
    height: '1.25rem',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  alert: {
    padding: '1.25rem',
    borderRadius: '1rem',
    marginBottom: '2rem',
    fontWeight: '500',
    textAlign: 'center',
    fontSize: '1rem'
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
    marginTop: '2.5rem',
    textAlign: 'center'
  },
  authFooterText: {
    color: '#6b7280',
    fontSize: '1rem'
  },
  authSwitch: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem'
  },
  backendStatus: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  dashboard: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  backendIndicator: {
    background: '#10b981',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  searchBar: {
    flex: 1,
    maxWidth: '400px',
    margin: '0 2rem'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '2rem',
    fontSize: '0.875rem',
    background: '#f9fafb'
  },
  notificationButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    position: 'relative',
    padding: '0.5rem'
  },
  notificationDot: {
    position: 'absolute',
    top: '0.25rem',
    right: '0.25rem',
    background: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    width: '1.25rem',
    height: '1.25rem',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  userAvatar: {
    width: '3rem',
    height: '3rem',
    background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: 'white',
    fontSize: '1rem'
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.5rem'
  },
  main: {
    display: 'flex',
    height: 'calc(100vh - 80px)'
  },
  sidebar: {
    width: '280px',
    background: 'white',
    borderRight: '1px solid #e5e7eb',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    background: 'none',
    border: 'none',
    borderRadius: '1rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.3s ease',
    position: 'relative'
  },
  navItemActive: {
    background: '#4f46e5',
    color: 'white'
  },
  navIcon: {
    fontSize: '1.25rem'
  },
  navLabel: {
    flex: 1,
    textAlign: 'left'
  },
  navBadge: {
    background: '#ef4444',
    color: 'white',
    borderRadius: '1rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    minWidth: '1.5rem',
    textAlign: 'center'
  },
  quickActions: {
    marginTop: 'auto'
  },
  quickAction: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #e5e7eb',
    padding: '1rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textAlign: 'left',
    marginBottom: '0.5rem',
    transition: 'all 0.3s ease'
  },
  content: {
    flex: 1,
    background: '#f8fafc',
    overflow: 'auto'
  },
  page: {
    padding: '2rem'
  },
  pageHeader: {
    marginBottom: '2rem'
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.5rem'
  },
  pageSubtitle: {
    color: '#6b7280',
    fontSize: '1.125rem'
  },
  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  userCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '1.5rem',
    padding: '1.5rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  userCardHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  userAvatarLarge: {
    fontSize: '3rem'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  userMajor: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: '0.875rem',
    marginBottom: '0.5rem'
  },
  userBio: {
    color: '#6b7280',
    fontSize: '0.875rem',
    lineHeight: '1.5'
  },
  interests: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  interestTag: {
    background: '#f3f4f6',
    color: '#374151',
    padding: '0.375rem 0.75rem',
    borderRadius: '1rem',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  connectButton: {
    width: '100%',
    background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '1rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  friendsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  friendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  friendAvatar: {
    fontSize: '2.5rem'
  },
  friendInfo: {
    flex: 1
  },
  friendName: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  friendDetails: {
    color: '#6b7280',
    fontSize: '0.875rem',
    marginBottom: '0.5rem'
  },
  friendInterests: {
    display: 'flex',
    gap: '0.5rem'
  },
  friendInterest: {
    background: '#f3f4f6',
    color: '#374151',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem'
  },
  chatButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  requestsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  requestCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '1.5rem',
    padding: '1.5rem'
  },
  requestHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  requestAvatar: {
    fontSize: '3rem'
  },
  requestInfo: {
    flex: 1
  },
  requestName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  requestDetails: {
    color: '#6b7280',
    fontSize: '0.875rem',
    marginBottom: '0.25rem'
  },
  requestTime: {
    color: '#9ca3af',
    fontSize: '0.75rem'
  },
  requestActions: {
    display: 'flex',
    gap: '1rem'
  },
  acceptButton: {
    flex: 1,
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '1rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  rejectButton: {
    flex: 1,
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '1rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  chatContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'white'
  },
  chatHeader: {
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  chatUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  chatAvatar: {
    fontSize: '2.5rem'
  },
  chatUserName: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  chatUserStatus: {
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  messagesContainer: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: '#f8fafc'
  },
  emptyChat: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '3rem 1rem'
  },
  emptyChatIcon: {
    fontSize: '4rem',
    marginBottom: '1.5rem'
  },
  message: {
    maxWidth: '70%',
    padding: '1rem 1.25rem',
    borderRadius: '1.5rem',
    position: 'relative',
    opacity: 0,
    animation: 'messageFadeIn 0.3s ease forwards'
  },
  ownMessage: {
    background: '#4f46e5',
    color: 'white',
    alignSelf: 'flex-end',
    borderBottomRightRadius: '0.5rem'
  },
  otherMessage: {
    background: 'white',
    color: '#1f2937',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  messageContent: {
    fontSize: '1rem',
    lineHeight: '1.5',
    marginBottom: '0.5rem'
  },
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.7,
    textAlign: 'right'
  },
  messageForm: {
    padding: '1.5rem 2rem',
    borderTop: '1px solid #e5e7eb',
    background: 'white'
  },
  messageInputContainer: {
    display: 'flex',
    gap: '1rem'
  },
  messageInput: {
    flex: 1,
    padding: '1rem 1.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '2rem',
    fontSize: '1rem',
    outline: 'none'
  },
  sendButton: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '1rem 1.5rem',
    borderRadius: '2rem',
    fontSize: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  welcome: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  },
  welcomeContent: {
    textAlign: 'center',
    maxWidth: '500px'
  },
  welcomeIcon: {
    fontSize: '4rem',
    marginBottom: '1.5rem'
  },
  welcomeTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '1rem'
  },
  welcomeSubtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    marginBottom: '3rem',
    lineHeight: '1.6'
  },
  welcomeStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '3rem',
    marginBottom: '3rem'
  },
  welcomeStat: {
    textAlign: 'center'
  },
  welcomeActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '2rem'
  },
  welcomeAction: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '1rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  liveIndicator: {
    background: '#10b981',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '2rem',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  notificationsContainer: {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  notification: {
    padding: '1rem 1.5rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    fontWeight: '500',
    maxWidth: '320px',
    opacity: 0,
    transform: 'translateX(100%)',
    animation: 'slideInRight 0.3s ease forwards'
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

// Add CSS Animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes gradientShift {
      0% { background-position: 0% 50% }
      50% { background-position: 100% 50% }
      100% { background-position: 0% 50% }
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes messageFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .feature-card:hover {
      transform: translateY(-5px);
      boxShadow: 0 20px 40px rgba(0,0,0,0.1);
    }

    .slide-in {
      animation: slideInRight 0.3s ease forwards;
    }

    .message-fade-in {
      animation: messageFadeIn 0.3s ease forwards;
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.5rem;
      }
      
      .hero-buttons {
        flex-direction: column;
      }
      
      .features-showcase {
        grid-template-columns: 1fr;
      }
      
      .main {
        flex-direction: column;
      }
      
      .sidebar {
        width: 100%;
        height: auto;
        order: 2;
      }
      
      .content {
        order: 1;
      }
    }
  `;
  document.head.appendChild(style);
}
