import { TopBar } from './top-bar'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { PlayerBar } from '@/components/player/player-bar'
import { LyricsPanel } from '@/components/lyrics/lyrics-panel'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grid min-h-dvh grid-rows-[auto_1fr] overflow-hidden bg-[radial-gradient(circle_at_55%_0%,rgba(78,230,255,0.055),transparent_32%)]">
        <TopBar />
        <div className="grid min-h-0 grid-cols-1 md:grid-cols-[216px_1fr]">
          <Sidebar />
          <main className="relative min-h-0 overflow-auto scroll-smooth pb-28 md:pb-32">{children}</main>
        </div>
      </div>
      <PlayerBar />
      <LyricsPanel />
      <MobileNav />
    </>
  )
}
