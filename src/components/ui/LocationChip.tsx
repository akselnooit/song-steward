import { MapPin } from 'lucide-react'

interface LocationChipProps {
  value?: string
  onClick?: () => void
}

export function LocationChip({ value, onClick }: LocationChipProps) {
  const active = value && value !== 'Wszystkie'

  if (!active) {
    return (
      <div className="icon-btn" onClick={onClick} title="Filtr lokalizacji">
        <MapPin size={19} strokeWidth={1.7} />
      </div>
    )
  }

  return (
    <button className="loc-chip" onClick={onClick} title="Zmień w Ustawieniach → Filtry">
      <MapPin size={15} strokeWidth={1.7} />
      {value}
    </button>
  )
}
