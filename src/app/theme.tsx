import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'
const KEY = 'labasset.theme'

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: 'system',
  setTheme: () => {},
})

function isDark(theme: Theme) {
  return (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark(theme))
  }, [theme])
  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* bỏ qua */
    }
    setThemeState(t)
  }
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
