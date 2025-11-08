'use client'

import { useState, useEffect, useRef } from 'react'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PaperAirplaneIcon, 
  MicrophoneIcon,
  PhotoIcon,
  FaceSmileIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline'

export default function ChatInterface({ selectedGroup, selectedChannel, onGroupSelect, onChannelSelect }) {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const messagesEndRef = useRef(null)
  const queryClient = useQueryClient()

  // Fetch messages for selected channel
  const { data: channelMessages = [] } = useQuery({
    queryKey: ['messages', selectedGroup?._id, selectedChannel],
    queryFn: async () => {
      if (!selectedGroup || !selectedChannel) return []
      
      const { data } = await api.get(
        `/messages/${selectedGroup._id}/${selectedChannel}`
      )
      return data.messages
    },
    enabled: !!selectedGroup && !!selectedChannel,
  })

  useEffect(() => {
    setMessages(channelMessages)
  }, [channelMessages])

  // Socket event listeners
  useEffect(() => {
    if (!socket || !selectedGroup || !selectedChannel) return

    const handleNewMessage = (newMessage) => {
      if (newMessage.group === selectedGroup._id && newMessage.channel === selectedChannel) {
        setMessages(prev => [...prev, newMessage])
      }
    }

    const handleMessageUpdate = (updatedMessage) => {
      setMessages(prev => prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      ))
    }

    socket.on('new_message', handleNewMessage)
    socket.on('message_updated', handleMessageUpdate)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('message_updated', handleMessageUpdate)
    }
  }, [socket, selectedGroup, selectedChannel])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const { data } = await api.post('/messages/send', messageData)
      return data.message
    },
    onSuccess: (sentMessage) => {
      if (socket) {
        socket.emit('send_message', sentMessage)
      }
      setMessage('')
      queryClient.invalidateQueries(['messages', selectedGroup?._id, selectedChannel])
    },
  })

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedGroup || !selectedChannel) return

    sendMessageMutation.mutate({
      content: { text: message },
      group: selectedGroup._id,
      channel: selectedChannel,
      type: 'text'
    })
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  if (!selectedGroup || !selectedChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
            <PaperAirplaneIcon className="w-12 h-12 text-white transform -rotate-45" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to CampusConnect
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Select a group and channel to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              #{selectedChannel}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedGroup.name} • {messages.length} messages
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-6">
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message #${selectedChannel}`}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                rows="1"
              />
              <div className="absolute right-3 top-3 flex space-x-2">
                <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <FaceSmileIcon className="w-5 h-5" />
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <PaperClipIcon className="w-5 h-5" />
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <PhotoIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isLoading}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5 transform -rotate-45" />
          </button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const { user } = useAuth()
  const isOwnMessage = message.sender._id === user?.id

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
        isOwnMessage 
          ? 'bg-primary-600 text-white rounded-br-none' 
          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none border border-gray-200 dark:border-gray-600'
      }`}>
        {!isOwnMessage && (
          <p className="text-sm font-medium mb-1">{message.sender.firstName}</p>
        )}
        <p className="text-sm">{message.content.text}</p>
        <p className={`text-xs mt-1 ${
          isOwnMessage ? 'text-primary-200' : 'text-gray-500'
        }`}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}
