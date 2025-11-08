import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from './components/QueryClientProvider'
import { SocketProvider } from './contexts/SocketContext'
import { AuthProvider } from './contexts/AuthContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'CampusConnect - Student Communication Platform',
  description: 'A modern communication platform designed for students, clubs, and organizations',
  keywords: 'students, clubs, communication, collaboration, campus',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryClientProvider>
            <AuthProvider>
              <SocketProvider>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                  {children}
                </div>
              </SocketProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
