// iOS Safari nigdy nie zaimplementował Vibration API (navigator.vibrate),
// więc na iPhonie ta wywołanie normalnie nic nie robi. Jedyny dostępny
// „hak": natywny input[type=checkbox][switch] (Safari 17.4+) daje realny
// haptyczny tap przy kliknięciu. Trzymamy jeden ukryty switch w DOM i
// klikamy go programowo — zadziała najpewniej blisko realnego gestu
// użytkownika (tap); przy potrząśnięciu telefonem to best-effort, bo iOS
// może wymagać niedawnego kliknięcia, by przyznać haptykę.
let switchEl: HTMLInputElement | null = null

function getHapticSwitch(): HTMLInputElement {
  if (switchEl) return switchEl
  const label = document.createElement('label')
  label.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.tabIndex = -1
  input.setAttribute('aria-hidden', 'true')
  label.appendChild(input)
  document.body.appendChild(label)
  switchEl = input
  return input
}

export function vibrate(ms = 30): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms)
    return
  }
  if (typeof document === 'undefined') return
  try {
    getHapticSwitch().click()
  } catch {
    // brak wsparcia (np. desktop Safari/inne przeglądarki) — cicho ignorujemy
  }
}
