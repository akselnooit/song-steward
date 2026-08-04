import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { NotesStatus } from './NotesStatus'
import type { NotesSaveState } from '../hooks/useNotesAutosave'
import { useVisualViewport } from '../hooks/useVisualViewport'

/**
 * Pełnoekranowy edytor notatki — wzorzec z Notatek iOS i Google Keep.
 *
 * Powód istnienia: edycja długiej notatki w pudełku rosnącym z treścią wymagała
 * od nas przeliczania wysokości pola i przewijania ekranu na każde naciśnięcie
 * klawisza. WebKit malował wtedy karetkę według poprzedniego układu — tekst
 * wchodził w innym miejscu, niż stał kursor. Tutaj `textarea` zajmuje całą
 * dostępną wysokość i przewija się SAMA, natywnie; karetka jest w całości
 * sprawą przeglądarki. Jedyne, co liczymy, to wysokość warstwy — żeby pole
 * kończyło się nad klawiaturą.
 */
export function NotesEditor({ value, onChange, state, onClose }: {
  value: string
  onChange: (v: string) => void
  state: NotesSaveState
  onClose: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const box = useVisualViewport(true)

  // Raz, przy otwarciu: kursor na końcu notatki i widok jej końca — dopisywanie
  // to najczęstszy powód wejścia w notatkę. Jednorazowo jest to bezpieczne;
  // szkodziło powtarzanie tego przy każdej zmianie treści.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.selectionStart = el.selectionEnd = el.value.length
    el.scrollTop = el.scrollHeight
  }, [])

  return (
    <div
      className="note-edit-layer"
      style={box ? { top: box.top, height: box.height } : { top: 0, bottom: 0 }}
    >
      <div className="note-edit-head">
        <span className="note-edit-title">Notatki</span>
        <span className="note-edit-state"><NotesStatus state={state} /></span>
        <button className="btn btn-primary note-edit-done" onClick={onClose}>
          <Check size={16} strokeWidth={2} /> Gotowe
        </button>
      </div>
      <textarea
        ref={ref}
        className={`note-edit-area${state === 'error' ? ' err' : ''}`}
        value={value}
        placeholder="Notatka do nabożeństwa…"
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      />
    </div>
  )
}
