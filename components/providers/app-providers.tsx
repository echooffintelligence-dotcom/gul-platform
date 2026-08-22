'use client'

import { ToastProvider } from './toast-provider'
import { ThemeProvider } from './theme-provider'
import { WorkspaceProvider } from './workspace-provider'
import { PlayerProvider } from './player-provider'
import { ReleaseProvider } from './release-provider'
import { AuthProvider } from './auth-provider'
import { SocialProvider } from './social-provider'
import { PrivacyProvider } from './privacy-provider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PrivacyProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <ReleaseProvider>
                <SocialProvider>
                  <PlayerProvider>{children}</PlayerProvider>
                </SocialProvider>
              </ReleaseProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </PrivacyProvider>
    </ThemeProvider>
  )
}
