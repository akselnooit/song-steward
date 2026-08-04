import { useState, useEffect, useRef } from 'react'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { NOTES_MUTATION_KEY } from '../lib/queries/services'

// Notatki mają własny wskaźnik w narożniku pola. Dwa komunikaty o jednym błędzie
// to szum, a górna pastylka zasłania właśnie ten narożnik.
const isNotes = (m: { options: { mutationKey?: readonly unknown[] } }) =>
  m.options.mutationKey?.[0] === NOTES_MUTATION_KEY[0]

// Dwie fazy zamiast trzech. „Zapisano" celowo nie istnieje: potwierdzeniem udanej
// akcji jest toast na dole ekranu („Dodano do zaśpiewanych" itd.), a zniknięcie
// paska wystarcza jako sygnał zakończenia. Wcześniej użytkownik dostawał dwa
// potwierdzenia naraz, a górna pastylka zasłaniała ikonę edycji.
type Phase = 'idle' | 'saving' | 'error'

export function SyncIndicator() {
  const qc = useQueryClient()
  const isMutating = useIsMutating({ predicate: m => !isNotes(m) })
  const [phase, setPhase] = useState<Phase>('idle')

  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevMutating = useRef(0)
  const hadError = useRef(false)

  // Detect errors via mutation cache events
  useEffect(() => {
    return qc.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || !event.mutation) return
      if (isNotes(event.mutation)) return
      const status = event.mutation.state.status
      if (status === 'error') {
        hadError.current = true
        if (savingTimer.current) { clearTimeout(savingTimer.current); savingTimer.current = null }
        setPhase('error')
      } else if (status === 'success') {
        // Bez tego pastylka „Nie zapisano" wisiała do kliknięcia: w fazie `error`
        // efekt niżej nie ma jak wrócić do `idle`. Udany zapis jest dowodem, że
        // połączenie wróciło — komunikat gaśnie sam.
        hadError.current = false
        if (savingTimer.current) { clearTimeout(savingTimer.current); savingTimer.current = null }
        setPhase('idle')
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
