'use client'

import { useEffect, useRef } from 'react'
import { Activity } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'

export function AudioVisualizer() {
  const { visualizerEnabled, toggleVisualizer, frequencyData, playing } = usePlayer()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !visualizerEnabled) return
    const context = canvas.getContext('2d')
    if (!context) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio))
      canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio))
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const rect = canvas.getBoundingClientRect()
    context.clearRect(0, 0, rect.width, rect.height)
    const gap = 3
    const width = Math.max(2, (rect.width - gap * (frequencyData.length - 1)) / Math.max(1, frequencyData.length))
    frequencyData.forEach((amplitude, index) => {
      const height = Math.max(2, amplitude * (rect.height - 12))
      const x = index * (width + gap)
      const gradient = context.createLinearGradient(0, rect.height, 0, rect.height - height)
      gradient.addColorStop(0, '#4ee6ff')
      gradient.addColorStop(.58, '#b9f7ff')
      gradient.addColorStop(1, '#ff4fa8')
      context.fillStyle = gradient
      context.shadowBlur = playing ? 14 : 4
      context.shadowColor = '#4ee6ff'
      context.fillRect(x, rect.height - height, width, height)
    })
    observer.disconnect()
  }, [frequencyData, playing, visualizerEnabled])

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_50%_0%,rgba(78,230,255,.12),transparent_55%),rgba(3,8,18,.75)] p-4 shadow-inner shadow-cyan-300/5">
      <div className="flex items-center justify-between gap-3"><div><div className="eyebrow">web audio spectrum</div><h3 className="mt-1 text-sm font-semibold">Живой визуализатор</h3></div><button type="button" aria-pressed={visualizerEnabled} onClick={toggleVisualizer} className={visualizerEnabled ? 'solid !px-3 !py-2 !text-xs' : 'ghost !px-3 !py-2 !text-xs'}><Activity className="h-3.5 w-3.5" />{visualizerEnabled ? 'Выключить' : 'Визуализатор'}</button></div>
      {visualizerEnabled ? <canvas ref={canvasRef} className="mt-4 h-28 w-full rounded-xl bg-black/30" aria-label="Спектр текущего трека" /> : <p className="mt-3 text-sm text-ink-3">Включите спектр: частоты будут считываться напрямую из Web Audio analyser во время воспроизведения.</p>}
    </section>
  )
}
