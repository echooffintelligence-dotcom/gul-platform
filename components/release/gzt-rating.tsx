'use client'

import { useState } from 'react'
import { Gem, PenLine, Trophy } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import { useReleases } from '@/components/providers/release-provider'
import { GZT_CORE_MAX, GZT_CRITERIA, GZT_MAX, gztCertification, gztTotal, type GztScore } from '@/lib/data'
import { GztRadarChart } from './gzt-radar-chart'
import { cn } from '@/lib/utils'

const empty: GztScore = { text: 0, structure: 0, style: 0, individuality: 0, atmosphere: 0 }

export function GztRating({ releaseId }: { releaseId: string }) {
  const { toast } = useToast()
  const { rateRelease } = useReleases()
  const [score, setScore] = useState<GztScore>(empty)
  const [submitted, setSubmitted] = useState(false)
  const total = gztTotal(score)
  const core = score.text + score.structure + score.style + score.individuality
  const vibeMultiplier = score.atmosphere / 5
  const touched = core > 0 && score.atmosphere > 0
  const certification = gztCertification(total)
  const CertificationIcon = certification === 'diamond' ? Gem : certification === 'gold' ? Trophy : PenLine
  const certificationLabel = certification === 'diamond' ? 'Бриллиант ГУЛА' : certification === 'gold' ? 'Золотой релиз' : 'Underground / Свежий звук'

  return <div className={cn('border p-4', certification === 'diamond' ? 'border-accent-1/50 bg-[radial-gradient(circle_at_50%_0%,rgba(78,230,255,.16),transparent_60%)]' : certification === 'gold' ? 'border-accent-hot/35 bg-accent-hot/[.035]' : 'border-ink')}><div className="flex items-baseline justify-between gap-3"><div><div className="eyebrow">твоя оценка · ГЗТ</div><p className="mt-1 text-xs text-ink-3">База × атмосфера / вайб</p></div><div className="text-right"><div className="flex items-baseline justify-end gap-1"><span className="tabnum font-mono text-[2rem] font-semibold leading-none tracking-[-.03em]">{total.toFixed(1)}</span><span className="font-mono text-sm text-ink-3">/90</span></div><span className={cn('mt-1 inline-flex items-center gap-1 font-mono text-[.6rem] uppercase tracking-[.07em]', certification === 'diamond' ? 'text-accent-1' : certification === 'gold' ? 'text-accent-hot' : 'text-ink-3')}><CertificationIcon className="h-3 w-3" />{certificationLabel}</span></div></div>
    <div className="mt-4"><GztRadarChart score={score} /></div>
    <div className="mt-4 grid gap-3">{GZT_CRITERIA.map((criterion, index) => { const value = score[criterion.key]; const coefficient = index === GZT_CRITERIA.length - 1; return <div key={criterion.key}><div className="flex items-center justify-between gap-2"><label htmlFor={`gzt-${criterion.key}`} className="text-[.8125rem] text-ink-2">{criterion.label}{coefficient && <span className="ml-1 font-mono text-[.58rem] text-accent-1">×</span>}</label><span className={cn('tabnum font-mono text-[.8125rem]', value > 0 ? 'text-ink' : 'text-ink-3')}>{value}/{criterion.max}</span></div><input id={`gzt-${criterion.key}`} type="range" min={0} max={criterion.max} step={1} value={value} onChange={(event) => { setScore((previous) => ({ ...previous, [criterion.key]: Number(event.target.value) })); setSubmitted(false) }} className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-paper-2 accent-[var(--accent-1)]" aria-label={criterion.label} /></div> })}</div>
    <div className="mt-4 rounded-xl border border-rule bg-paper-2 p-3 font-mono text-[.68rem] text-ink-3"><div className="flex justify-between"><span>База: {core}/{GZT_CORE_MAX}</span><span>Вайб: ×{vibeMultiplier.toFixed(2)}</span></div><p className="mt-1">({core}) × ({score.atmosphere}/5) × 2.25 → нормировано к {GZT_MAX}.</p></div>
    <div className="mt-4 flex items-center gap-2"><button type="button" className="solid flex-1" disabled={!touched} onClick={() => { rateRelease(releaseId, score); setSubmitted(true); toast(`ГЗТ ${total.toFixed(1)}/90 сохранён`) }}>{submitted ? 'Оценка сохранена' : 'Оценить'}</button><button type="button" className="ghost" onClick={() => toast('Форма подробной рецензии доступна ниже')}><PenLine width={14} height={14} /> Рецензия</button></div></div>
}
