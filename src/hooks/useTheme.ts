import { useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('ss-theme') ?? 'dark') as Theme
  )

  const setTheme = (t: Theme) => {
    localStorage.setItem('ss-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    setThemeState(t)
  }

  return [theme, setTheme] as const
}
