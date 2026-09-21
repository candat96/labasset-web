import { createContext, useContext } from 'react'

export const InFilterFieldContext = createContext(false)

/** True when the control is rendered inside FilterField (hide nested labels). */
export function useInFilterField() {
  return useContext(InFilterFieldContext)
}
