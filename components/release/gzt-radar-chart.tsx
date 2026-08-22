'use client'

import { GZT_CRITERIA, type GztScore } from '@/lib/data'

const order: (keyof GztScore)[] = ['text', 'structure', 'style', 'individuality', 'atmosphere']
const center = 112
const radius = 81
const coords = (index: number, value: number): [number, number] => {
  const angle = -Math.PI / 2 + index / order.length * Math.PI * 2
  return [center + Math.cos(angle) * radius * value, center + Math.sin(angle) * radius * value]
}
const point = (index: number, value: number) => coords(index, value).join(',')

export function GztRadarChart({ score }: { score: GztScore }) {
  const values = order.map((key, index) => score[key] / GZT_CRITERIA[index].max)
  const polygon = values.map((value, index) => point(index, value)).join(' ')
  return <div className="rounded-2xl border border-accent-1/15 bg-accent-1/[.025] p-3"><div className="eyebrow">баланс ГЗТ</div><svg viewBox="0 0 224 224" className="mx-auto mt-2 w-full max-w-[250px] overflow-visible" role="img" aria-label="Пятиосевая диаграмма ГЗТ">{[.25, .5, .75, 1].map((level) => <polygon key={level} points={order.map((_, index) => point(index, level)).join(' ')} fill="none" stroke="rgba(171,193,255,.15)" strokeWidth="1" />)}{order.map((key, index) => { const [x, y] = coords(index, 1); const [labelX, labelY] = coords(index, 1.18); return <g key={key}><line x1={center} y1={center} x2={x} y2={y} stroke="rgba(171,193,255,.16)" /><text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill="#9aa9c8" fontSize="8">{GZT_CRITERIA[index].label.split(' / ')[0]}</text></g>})}<polygon points={polygon} fill="rgba(78,230,255,.18)" stroke="#4ee6ff" strokeWidth="2" strokeLinejoin="round" />{values.map((value, index) => { const [x, y] = coords(index, value); return <circle key={order[index]} cx={x} cy={y} r="3" fill="#f6f8ff" stroke="#4ee6ff" strokeWidth="1" /> })}</svg></div>
}
