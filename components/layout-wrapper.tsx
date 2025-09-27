"use client"

import PremiumSidebar from "./premium-sidebar"
import { ActiveTaskHeader } from "./active-task-header"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <>
      <PremiumSidebar />
      <ActiveTaskHeader />
      <main className="min-h-screen ml-72 pt-16" style={{ paddingTop: 'max(4rem, var(--active-task-header-height, 4rem))', transition: 'padding-top 0.3s ease-in-out' }}>
        {children}
      </main>
    </>
  )
}