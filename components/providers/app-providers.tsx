'use client'

import { ToastProvider } from './toast-provider'
import { WorkspaceProvider } from './workspace-provider'
import { PlayerProvider } from './player-provider'
import { ReleaseProvider } from './release-provider'
import { AuthProvider } from './auth-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <ReleaseProvider>
            <PlayerProvider>{children}</PlayerProvider>
          </ReleaseProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
