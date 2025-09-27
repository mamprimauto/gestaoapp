"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface TimeSyncContextType {
  triggerUpdate: () => void
  lastUpdate: number
}

const TimeSyncContext = createContext<TimeSyncContextType>({
  triggerUpdate: () => {},
  lastUpdate: 0
})

export function TimeSyncProvider({ children }: { children: ReactNode }) {
  const [lastUpdate, setLastUpdate] = useState(0)

  const triggerUpdate = () => {
    setLastUpdate(Date.now())
  }

  return (
    <TimeSyncContext.Provider value={{ triggerUpdate, lastUpdate }}>
      {children}
    </TimeSyncContext.Provider>
  )
}

export function useTimeSync() {
  return useContext(TimeSyncContext)
}