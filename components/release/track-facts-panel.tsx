import { Disc3, Mic2, Music2, Tag, Waves } from 'lucide-react'
import { Credits } from '@/components/shared/credits'
import type { Track } from '@/lib/data'

export function TrackFactsPanel({ track }: { track?: Track }) {
  if (!track?.facts) return null
  const { producedBy = [], writtenBy = [], mixedMasteredBy = [], samples = [], tags = [] } = track.facts
  const rows = [
    { label: 'Produced by', icon: Music2, credits: producedBy },
    { label: 'Written by', icon: Mic2, credits: writtenBy },
    { label: 'Mixed & Mastered by', icon: Waves, credits: mixedMasteredBy },
  ].filter((row) => row.credits.length > 0)
  return <section className="mt-6 rounded-2xl border border-accent-1/15 bg-[linear-gradient(135deg,rgba(78,230,255,.06),rgba(167,139,250,.035))] p-4"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl border border-accent-1/30 bg-accent-1/10 text-accent-1"><Disc3 className="h-4 w-4" /></div><div><div className="eyebrow">genius-style metadata</div><h3 className="font-semibold">Создатели и факты о «{track.title}»</h3></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{rows.map((row) => { const Icon = row.icon; return <div key={row.label} className="rounded-xl border border-rule bg-paper-2 p-3"><div className="flex items-center gap-2 font-mono text-[.6rem] uppercase tracking-[.08em] text-ink-3"><Icon className="h-3.5 w-3.5 text-accent-1" />{row.label}</div><Credits credits={row.credits} className="mt-2" /></div> })}{samples.length > 0 && <div className="rounded-xl border border-rule bg-paper-2 p-3"><div className="font-mono text-[.6rem] uppercase tracking-[.08em] text-ink-3">Contains samples of</div><ul className="mt-2 grid gap-1 text-sm text-ink-2">{samples.map((sample) => <li key={sample}>“{sample}”</li>)}</ul></div>}{tags.length > 0 && <div className="rounded-xl border border-rule bg-paper-2 p-3"><div className="flex items-center gap-2 font-mono text-[.6rem] uppercase tracking-[.08em] text-ink-3"><Tag className="h-3.5 w-3.5 text-accent-1" />Теги / жанры</div><div className="mt-2 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-md border border-accent-1/20 bg-accent-1/[.06] px-2 py-1 font-mono text-[.62rem] text-accent-1">{tag}</span>)}</div></div>}</div></section>
}
