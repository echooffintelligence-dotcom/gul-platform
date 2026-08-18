'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Avatar } from '@/components/shared/art'
import { GZT_CRITERIA, gztTotal, type GztScore, type Review } from '@/lib/data'
import { cn } from '@/lib/utils'

type RichReview = Review & { title?: string; up: number; down: number }
type Sort = 'popular' | 'new' | 'strict'
const blank: GztScore = { text: 5, structure: 5, style: 5, individuality: 5, atmosphere: 3 }

export function Reviews({ reviews }: { reviews: Review[] }) {
  const [sort, setSort] = useState<Sort>('popular')
  const [items, setItems] = useState<RichReview[]>(() => reviews.map((review) => ({ ...review, score: review.score * 9, up: 0, down: 0 })))
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [score, setScore] = useState<GztScore>(blank)
  const total = gztTotal(score)
  const ordered = useMemo(() => [...items].sort((left, right) => sort === 'new' ? right.when.localeCompare(left.when) : sort === 'strict' ? left.score - right.score : (right.up - right.down) - (left.up - left.down)), [items, sort])
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (title.trim().length < 3 || text.trim().length < 20) return; setItems((previous) => [{ id: crypto.randomUUID(), author: 'Вы', initials: 'ВЫ', color: 'b', score: total, when: 'только что', title: title.trim(), text: text.trim(), up: 0, down: 0 }, ...previous]); setTitle(''); setText(''); setScore(blank) }
  function vote(id: string, direction: 'up' | 'down') { setItems((previous) => previous.map((review) => review.id === id ? { ...review, [direction]: review[direction] + 1 } : review)) }

  return <div><form onSubmit={submit} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.025] p-4"><div className="eyebrow">новая рецензия · ГЗТ</div><div className="mt-3 grid gap-3"><input required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок разбора" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-cyan-300/45" /><textarea required minLength={20} rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="Расскажите, что работает в релизе, а что можно было бы усилить…" className="resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-cyan-300/45" /><div className="grid gap-2 sm:grid-cols-2">{GZT_CRITERIA.map((criterion) => <label key={criterion.key} className="grid grid-cols-[1fr_auto] items-center gap-x-2 text-xs text-ink-2"><span>{criterion.label}</span><span className="font-mono text-cyan-100">{score[criterion.key]}/{criterion.max}</span><input className="col-span-2 w-full accent-cyan-300" type="range" min={0} max={criterion.max} value={score[criterion.key]} onChange={(event) => setScore((previous) => ({ ...previous, [criterion.key]: Number(event.target.value) }))} /></label>)}</div><div className="flex items-center justify-between gap-3"><span className="font-mono text-sm text-cyan-100">ГЗТ: {total.toFixed(1)}/90</span><button type="submit" className="solid">Опубликовать разбор</button></div></div></form>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="eyebrow">рецензии · {items.length}</div><div className="seg">{([['popular','Популярные'],['new','Новые'],['strict','Самые строгие']] as const).map(([value,label]) => <button key={value} type="button" className={cn(sort === value && 'on')} onClick={() => setSort(value)}>{label}</button>)}</div></div>
    <div className="mt-2">{ordered.map((review) => <article key={review.id} className="grid grid-cols-[44px_1fr] gap-4 border-b border-rule-soft py-4"><Avatar initials={review.initials} color={review.color} className="h-11 w-11 text-sm" /><div><div className="flex flex-wrap items-center gap-2"><b className="text-[.9375rem]">{review.author}</b><span className="rounded-md bg-cyan-300/10 px-1.5 font-mono text-[.75rem] text-cyan-100">{review.score.toFixed(1)}/90</span><span className="eyebrow">{review.when}</span></div>{review.title && <h4 className="mt-2 font-semibold">{review.title}</h4>}<p className="mt-1 max-w-[70ch] text-pretty text-[.9375rem] text-ink-2">{review.text}</p><div className="mt-3 flex gap-2"><button type="button" aria-label="Нравится рецензия" onClick={() => vote(review.id, 'up')} className="ghost !gap-1 !px-2 !py-1 !text-xs"><ThumbsUp className="h-3.5 w-3.5" />{review.up}</button><button type="button" aria-label="Не нравится рецензия" onClick={() => vote(review.id, 'down')} className="ghost !gap-1 !px-2 !py-1 !text-xs"><ThumbsDown className="h-3.5 w-3.5" />{review.down}</button></div></div></article>)}</div></div>
}
