'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Check } from 'lucide-react'

type ToastCtx = { toast: (msg: string) => void }

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((m: string) => {
    setMsg(m)
    setShow(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setShow(false), 2400)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[150px] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-[2px] bg-ink px-4 py-2 text-sm text-paper transition-all duration-200 data-[show=false]:translate-y-3.5 data-[show=false]:opacity-0 data-[show=true]:translate-y-0 data-[show=true]:opacity-100 sm:bottom-24"
        data-show={show}
      >
        <Check width={14} height={14} />
        {msg}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
