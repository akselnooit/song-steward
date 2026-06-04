import { useState, useEffect, useRef } from 'react'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { Loader2, Check, AlertCircle } from 'lucide-react'

type Phase = 'idle' | 'saving' | 'saved' | 'error'

export function SyncIndicator() {
  const qc = useQueryClient()
  const isMutating = useIsMutating()
  const [phase, setPhase] = useState<Phase>('idle')

  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevMutating = useRef(0)
  const hadError = useRef(false)

  // Detect errors via mutation cache events
  useEffect(() => {
    return qc.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation?.state.status === 'error') {
        hadError.current = true
        if (savingTimer.current) { clearTimeout(savingTimer.current); savingTimer.current = null }
        if (savedTimer.current) { clearTimeout(savedTimer.current); savedTimer.current = null }
        setPhase('error')
      }
    })
  }, [qc])

  useEffect(() => {
    const prev = prevMutating.current
    prevMutating.current = isMutating

    if (isMutating > 0) {
      if (prev === 0) hadError.current = false // new batch — reset error flag
      if (savedTimer.current) { clearTimeout(savedTimer.current); savedTimer.current = null }
      if (!savingTimer.current) {
        savingTimer.current = setTimeout(() => {
          savingTimer.current = null
          setPhase('saving')
        }, 400)
      }
    } else if (prev > 0 && !hadError.current) {
      if (savingTimer.current) { clearTimeout(savingTimer.current); savingTimer.current = null }
      setPhase('saved')
      savedTimer.current = setTimeout(() => {
        savedTimer.current = null
        setPhase('idle')
      }, 1500)
    }
  }, [isMutating])

  if (phase === 'idle') return null

  return (
    <button
      className={`sync-pill ${phase}`}
      onClick={phase === 'error' ? () => setPhase('idle') : undefined}
      style={{ pointerEvents: phase === 'error' ? 'auto' : 'none' }}
    >
      {phase === 'saving' && <span className="spin"><Loader2 size={13} strokeWidth={2} /></span>}
      {phase === 'saved'  && <Check size={13} strokeWidth={2.5} />}
      {phase === 'error'  && <AlertCircle size={13} strokeWidth={2} />}
      {phase === 'saving' && 'Zapisuję…'}
      {phase === 'saved'  && 'Zapisano'}
      {phase === 'error'  && 'Nie zapisano'}
    </button>
  )
}
