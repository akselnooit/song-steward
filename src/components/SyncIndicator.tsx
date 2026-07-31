import { useState, useEffect, useRef } from 'react'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

// Dwie fazy zamiast trzech. „Zapisano" celowo nie istnieje: potwierdzeniem udanej
// akcji jest toast na dole ekranu („Dodano do zaśpiewanych" itd.), a zniknięcie
// paska wystarcza jako sygnał zakończenia. Wcześniej użytkownik dostawał dwa
// potwierdzenia naraz, a górna pastylka zasłaniała ikonę edycji.
type Phase = 'idle' | 'saving' | 'error'

export function SyncIndicator() {
  const qc = useQueryClient()
  const isMutating = useIsMutating()
  const [phase, setPhase] = useState<Phase>('idle')

  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevMutating = useRef(0)
  const hadError = useRef(false)

  // Detect errors via mutation cache events
  useEffect(() => {
    return qc.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation?.state.status === 'error') {
        hadError.current = true
        if (savingTimer.current) { clearTimeout(savingTimer.current); savingTimer.current = null }
        setPhase('error')
      }
    })
  }, [qc])

  useEffect(() => {
    const prev = prevMutating.current
    prevMutating.current = isMutating

    if (isMutating > 0) {
      if (prev === 0) hadError.current = false // new batch — reset error flag
      // 400 ms progu: krótkie mutacje kończą się, zanim cokolwiek mrugnie.
      if (!savingTimer.current && phase !== 'error') {
        savingTimer.current = setTimeout(() => {
          savingTimer.current = null
          setPhase('saving')
        }, 400)
      }
    } else if (prev > 0 && !hadError.current) {
      if (savingTimer.current) { clearTimeout(savingTimer.current); savingTimer.current = null }
      setPhase('idle')
    }
  }, [isMutating, phase])

  useEffect(() => () => { if (savingTimer.current) clearTimeout(savingTimer.current) }, [])

  if (phase === 'idle') return null

  if (phase === 'error') {
    return (
      <button className="sync-error" onClick={() => setPhase('idle')}>
        <AlertCircle size={14} strokeWidth={2} /> Nie zapisano
      </button>
    )
  }

  return <div className="sync-bar" role="status" aria-label="Zapisywanie" />
}
