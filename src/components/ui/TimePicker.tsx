import { useEffect, useState } from 'react'
import { HRow } from './HRow'
import { formatTimePL } from '../../lib/dates'

// Godziny, o których nabożeństwa odbywają się realnie. Świadomie NA SZTYWNO,
// a nie liczone z historii: przewidywalne miejsce kafelka jest warte więcej niż
// automatyka, która raz po raz przestawia go pod palcem. Kolejność chronologiczna
// — pary przedpołudniowa i wieczorna leżą obok siebie.
const POPULAR = ['11:00', '12:00', '19:00', '20:00']

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6:00 – 22:00
const QUARTERS = ['00', '15', '30', '45']

interface TimePickerProps {
  /** „HH:MM" albo null, gdy użytkownik jeszcze nie wybrał. */
  value: string | null
  onChange: (value: string) => void
}

/**
 * Wybór godziny nabożeństwa z dokładnością do 15 minut.
 *
 * Kompromis między „jedno tapnięcie" i „dowolna godzina": dwie popularne
 * godziny leżą od razu na wierzchu, a „Inna…" rozwija pełny wybór (godzina +
 * kwadrans). Nic nie jest wybrane na start — godzina jest obowiązkowa, więc
 * musi być decyzją, a nie przypadkowo zostawioną wartością domyślną.
 */
export function TimePicker({ value, onChange }: TimePickerProps) {
  const [expanded, setExpanded] = useState(false)
  const isCustom = value !== null && !POPULAR.includes(value)
  const [hour, setHour] = useState<number | null>(null)

  // Wejście w edycję istniejącego nabożeństwa o niestandardowej godzinie: pasek
  // godzin ma od razu pokazywać, która jest wybrana (a nie pustkę).
  useEffect(() => {
    if (isCustom && value) setHour(Number(value.split(':')[0]))
  }, [isCustom, value])

  const pickHour = (h: number) => {
    setHour(h)
    // Kwadrans zostawiamy taki, jaki był wybrany — zmiana samej godziny z 9:30
    // na 10:30 nie powinna po cichu gubić minut.
    const minutes = value?.split(':')[1] ?? '00'
    onChange(`${String(h).padStart(2, '0')}:${QUARTERS.includes(minutes) ? minutes : '00'}`)
  }

  const pickQuarter = (q: string) => {
    const h = hour ?? Number(value?.split(':')[0] ?? 11)
    onChange(`${String(h).padStart(2, '0')}:${q}`)
    // Kwadrans jest ostatnią decyzją — po nim panel się zwija, żeby nie zasłaniał
    // przycisku zapisu. Powrót do zmian: ponowne tapnięcie „Inna…".
    setExpanded(false)
  }

  const currentQuarter = value?.split(':')[1] ?? null

  return (
    <>
      <HRow selected={value} style={{ marginBottom: expanded ? 10 : 18 }}>
        {POPULAR.map(t => (
          <button
            key={t}
            type="button"
            className={`tag${value === t ? ' include' : ''}`}
            data-selected={value === t ? 'true' : undefined}
            aria-pressed={value === t}
            onClick={() => { onChange(t); setExpanded(false) }}
          >
            {formatTimePL(t)}
          </button>
        ))}
        {isCustom && value && (
          <button
            type="button"
            className="tag include"
            data-selected="true"
            aria-pressed="true"
            onClick={() => setExpanded(e => !e)}
          >
            {formatTimePL(value)}
          </button>
        )}
        <button
          type="button"
          className={`tag${expanded ? ' include' : ''}`}
          aria-expanded={expanded}
          onClick={() => setExpanded(e => !e)}
        >
          {isCustom ? 'Zmień…' : 'Inna…'}
        </button>
      </HRow>

      {expanded && (
        <>
          <HRow selected={hour == null ? null : String(hour)} style={{ marginBottom: 8 }}>
            {HOURS.map(h => (
              <button
                key={h}
                type="button"
                className={`tag${hour === h ? ' include' : ''}`}
                data-selected={hour === h ? 'true' : undefined}
                aria-pressed={hour === h}
                onClick={() => pickHour(h)}
              >
                {h}
              </button>
            ))}
          </HRow>
          <HRow selected={currentQuarter} style={{ marginBottom: 18 }}>
            {QUARTERS.map(q => (
              <button
                key={q}
                type="button"
                className={`tag${hour != null && currentQuarter === q ? ' include' : ''}`}
                data-selected={hour != null && currentQuarter === q ? 'true' : undefined}
                aria-pressed={hour != null && currentQuarter === q}
                disabled={hour == null}
                style={hour == null ? { opacity: 0.45 } : undefined}
                onClick={() => pickQuarter(q)}
              >
                :{q}
              </button>
            ))}
          </HRow>
        </>
      )}
    </>
  )
}
