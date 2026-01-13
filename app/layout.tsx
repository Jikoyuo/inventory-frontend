import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ReduxProvider from '../components/ReduxProvider'
import { HeartbeatManager } from '../components/HeartbeatManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Prabs Inventory',
  description: 'Realtime Warehouse Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider>
          <HeartbeatManager />
          {children}
        </ReduxProvider>
      </body>
    </html>
  )
}