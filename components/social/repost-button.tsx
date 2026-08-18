'use client'

import { Repeat2 } from 'lucide-react'
import { useSocial } from '@/components/providers/social-provider'
import { useToast } from '@/components/providers/toast-provider'
import { cn } from '@/lib/utils'

export function RepostButton({ releaseId, title, compact = false }: { releaseId: string; title: string; compact?: boolean }) {
  const { isReposted, toggleRepost } = useSocial()
  const { toast } = useToast()
  const reposted = isReposted(releaseId)
  return <button type="button" aria-pressed={reposted} onClick={() => { toggleRepost(releaseId, title); toast(reposted ? `Репост «${title}» убран` : `Вы репостнули «${title}»`) }} className={cn('inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 font-mono text-[.65rem] uppercase tracking-[.06em] text-ink-2 transition-all hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 active:scale-95', reposted && 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100', compact && 'px-1.5 py-1')}><Repeat2 className="h-3.5 w-3.5" />{compact ? null : reposted ? 'Репостнуто' : 'Репост'}</button>
}
