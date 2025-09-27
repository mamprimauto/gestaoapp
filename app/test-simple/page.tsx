'use client'

import { useState } from 'react'

export default function TestPage() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isInitializing] = useState(false)
  
  if (isInitializing) {
    return <div>Loading...</div>
  }
  
  if (!isUnlocked) {
    return <div>Locked</div>
  }
  
  return (
    <div className="min-h-screen bg-background p-6">
      <h1>Test Page Works!</h1>
    </div>
  )
}