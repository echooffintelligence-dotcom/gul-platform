'use client'

import { useState } from 'react'
import { PenLine } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import { useReleases } from '@/components/providers/release-provider'
import { RZT_CRITERIA, RZT_MAX, rztTotal, type RztScore } from '@/lib/data'
import { cn } from '@/lib/utils'

const empty: RztScore = { text: 0, structure: 0, style: 0, individuality: 0, atmosphere: 0, trend: 0 }

/** Оценка релиза по шести критериям РЗТ с сохранением в клиентский store. */
export function RztRating({ releaseId }: { releaseId: string }) {
  const { toast } = useToast()
  const { rateRelease } = useReleases()
  const [score, setScore] = useState<RztScore>(empty)
  const [submitted, setSubmitted] = useState(false)

  const total = rztTotal(score)
  const sum = score.text + score.structure + score.style + score.individuality + score.atmosphere + score.trend
  const touched = sum > 0

  const set = (key: keyof RztScore, value: number) => {
    setScore((previous) => ({ ...previous, [key]: value }))
    setSubmitted(false)
  }

  return (
    <div className="border border-ink p-4">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">твоя оценка · РЗТ</div>
        <div className="flex items-baseline gap-1">
          <span className="tabnum font-mono text-[2rem] font-semibold leading-none tracking-[-0.03em]">{total.toFixed(1)}</span>
          <span className="font-mono text-sm text-ink-3">/10</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {RZT_CRITERIA.map((criterion) => {
          const value = score[criterion.key]
          return (
            <div key={criterion.key}>
              <div className="flex items-center justify-between">
                <label htmlFor={`rzt-${criterion.key}`} className="text-[0.8125rem] text-ink-2">{criterion.label}</label>
                <span className={cn('tabnum font-mono text-[0.8125rem]', value > 0 ? 'text-ink' : 'text-ink-3')}>{value}/{criterion.max}</span>
              </div>
              <input
                id={`rzt-${criterion.key}`}
                type="range"
                min={0}
                max={criterion.max}
                step={1}
                value={value}
                onChange={(event) => set(criterion.key, Number(event.target.value))}
                className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-paper-2 accent-blue"
                aria-label={criterion.label}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="solid flex-1"
          disabled={!touched}
          onClick={() => {
            rateRelease(releaseId, score)
            setSubmitted(true)
            toast(`Оценка ${total.toFixed(1)} сохранена и учтена в чарте`)
          }}
        >
          {submitted ? 'Оценка сохранена' : 'Оценить'}
        </button>
        <button type="button" className="ghost" onClick={() => toast('Редактор рецензии будет доступен в следующем обновлении')}>
          <PenLine width={14} height={14} /> Рецензия
        </button>
      </div>
      <p className="mt-2 font-mono text-[0.625rem] text-ink-3">сумма {sum}/{RZT_MAX} · итог нормируется к 10 баллам</p>
    </div>
  )
}
