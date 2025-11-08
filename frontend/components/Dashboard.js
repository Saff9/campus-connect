'use client'

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'
import ChatInterface from './ChatInterface'
import GroupManagement from './GroupManagement'
import UserProfile from './UserProfile'
import NotificationCenter from './NotificationCenter'
import EventScheduler from './EventScheduler'

export default function Dashboard() {
  const { user } = useAuth()
  const [activeView, setActiveView] = useState('chat')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)

  const renderActiveView = () => {
    switch (activeView) {
      case 'chat':
        return (
          <ChatInterface 
            selectedGroup={selectedGroup}
            selectedChannel={selectedChannel}
            onGroupSelect={setSelectedGroup}
            onChannelSelect={setSelectedChannel}
          />
        )
      case 'groups':
        return <GroupManagement />
      case 'profile':
        return <UserProfile />
      case 'notifications':
        return <NotificationCenter />
      case 'events':
        return <EventScheduler />
      default:
        return (
          <ChatInterface 
            selectedGroup={selectedGroup}
            selectedChannel={selectedChannel}
            onGroupSelect={setSelectedGroup}
            onChannelSelect={setSelectedChannel}
          />
        )
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar 
        activeView={activeView}
        onViewChange={setActiveView}
        selectedGroup={selectedGroup}
        selectedChannel={selectedChannel}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderActiveView()}
      </main>
    </div>
  )
}
