import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { AppProviders } from '@/components/providers/app-providers'
import { AppShell } from '@/components/shell/app-shell'
import { Analytics } from '@vercel/analytics/react'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ГУЛ — одна почта, сколько угодно карточек',
  description:
    'ГУЛ — музыкальная платформа: чарты, релизы с оценками по ГЗТ, синхронный текст и мульти-карточки артистов на одной почте.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f2efe6',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${archivo.variable} ${plexMono.variable} bg-paper`}>
      <body className="antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  )
}