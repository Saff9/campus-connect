'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const AuthContext = createContext()

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campusConnectToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('campusConnectToken')
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  // Check if user is logged in on mount
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const token = localStorage.getItem('campusConnectToken')
      if (!token) throw new Error('No token')
      
      const { data } = await api.get('/auth/me')
      return data.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  useEffect(() => {
    if (!isLoading) {
      setUser(userData || null)
      setLoading(false)
    }
  }, [userData, isLoading])

  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      const { data } = await api.post('/auth/login', credentials)
      localStorage.setItem('campusConnectToken', data.token)
      return data.user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.invalidateQueries(['user'])
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (userData) => {
      const { data } = await api.post('/auth/register', userData)
      localStorage.setItem('campusConnectToken', data.token)
      return data.user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.invalidateQueries(['user'])
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout')
    },
    onSuccess: () => {
      localStorage.removeItem('campusConnectToken')
      setUser(null)
      queryClient.clear()
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData) => {
      const { data } = await api.put('/users/profile', profileData)
      return data.user
    },
    onSuccess: (user) => {
      setUser(user)
      queryClient.invalidateQueries(['user'])
    },
  })

  const value = {
    user,
    loading,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    isLoggingIn: loginMutation.isLoading,
    isRegistering: registerMutation.isLoading,
    isUpdatingProfile: updateProfileMutation.isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { api }
