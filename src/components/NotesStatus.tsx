import { AlertCircle, Check, Circle, Loader2, Pencil } from 'lucide-react'
import type { NotesSaveState } from '../hooks/useNotesAutosave'

/**
 * Stan zapisu notatki w narożniku pola — w miejscu, gdzie wcześniej stał sam
 * ołówek. Górna pastylka „Nie zapisano" zasłaniała właśnie ten narożnik i nie
 * mówiła, KTÓREGO pola dotyczy; tutaj informacja jest tam, gdzie się pisze.
 *
 * `pointer-events: none` (w CSS) zostawia całą powierzchnię pola tapnięciu —
 * dotknięcie pola po błędzie ponawia wysyłkę.
 */
const LABEL: Record<NotesSaveState, string> = {
  clean: 'Edytuj notatkę',
  dirty: 'Niezapisane zmiany',
  saving: 'Zapisywanie…',
  saved: 'Zapisano',
  error: 'Nie udało się zapisać — dotknij notatki, aby ponowić',
}

const MOD: Record<NotesSaveState, string> = {
  clean: '', dirty: 'dirty', saving: 'busy', saved: 'ok', error: 'err',
}

function Icon({ state }: { state: NotesSaveState }) {
  switch (state) {
    case 'dirty':  return <Circle size={9} strokeWidth={0} fill="currentColor" aria-hidden />
    case 'saving': return <Loader2 className="spin" size={14} strokeWidth={2} aria-hidden />
    case 'saved':  return <Check size={15} strokeWidth={2.2} aria-hidden />
    case 'error':  return <AlertCircle size={15} strokeWidth={2} aria-hidden />
    default:       return <Pencil size={15} strokeWidth={1.7} aria-hidden />
  }
}

export function NotesStatus({ state }: { state: NotesSaveState }) {
  return (
    <span
      className={`notes-status ${MOD[state]}`}
      role="status"
      aria-live="polite"
      aria-label={LABEL[state]}
      title={LABEL[state]}
    >
      <Icon state={state} />
    </span>
  )
}
