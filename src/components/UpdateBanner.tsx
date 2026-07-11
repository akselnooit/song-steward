import { RefreshCw } from 'lucide-react'
import { useVersionCheck } from '../hooks/useVersionCheck'

// Dyskretny baner „Dostępna nowa wersja — Odśwież". Bez auto-reloadu:
// reload wyłącznie po tapnięciu przycisku (brak ryzyka pętli/utraty pracy).
export function UpdateBanner() {
  const updateAvailable = useVersionCheck()
  if (!updateAvailable) return null

  return (
    <div className="update-banner" role="status">
      <RefreshCw size={15} strokeWidth={2} />
      <span>Dostępna nowa wersja</span>
      <button onClick={() => location.reload()}>Odśwież</button>
    </div>
  )
}
