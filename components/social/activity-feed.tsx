'use client'

import Link from 'next/link'
import { Repeat2 } from 'lucide-react'
import { useSocial } from '@/components/providers/social-provider'

export function ActivityFeed() {
  const { reposts } = useSocial()
  return <section className="mt-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.025] p-4"><div className="flex items-center gap-2"><Repeat2 className="h-4 w-4 text-cyan-200" /><div><div className="eyebrow">stream feed</div><h2 className="mt-1 font-semibold">Репосты</h2></div></div><div className="mt-4 grid gap-2">{reposts.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-ink-3">Лента пуста. Репостните релиз — действие появится здесь и останется в локальном профиле.</p> : reposts.map((repost) => <Link key={repost.id} href={`/release/${repost.releaseId}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 transition-colors hover:border-cyan-300/25 hover:bg-cyan-300/5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-300/10 text-cyan-100"><Repeat2 className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm"><b>@{repost.username}</b> репостнул(а) <span className="font-medium text-cyan-100">{repost.title}</span></p><p className="mt-1 font-mono text-[.62rem] text-ink-3">{new Date(repost.createdAt).toLocaleString('ru-RU')}</p></div></Link>)}</div></section>
}
