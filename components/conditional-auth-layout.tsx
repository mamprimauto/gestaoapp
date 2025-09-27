"use client"

import { usePathname } from "next/navigation"
import AuthGuard from "@/components/auth-guard"
import LayoutWrapper from "@/components/layout-wrapper"

interface ConditionalAuthLayoutProps {
  children: React.ReactNode
}

export default function ConditionalAuthLayout({ children }: ConditionalAuthLayoutProps) {
  const pathname = usePathname()
  
  // Routes that don't require authentication
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // If it's a public route, just render the children without auth or layout
  if (isPublicRoute) {
    return <>{children}</>
  }
  
  // For all other routes, wrap with AuthGuard and LayoutWrapper
  // AuthGuard will handle redirects to /login if not authenticated
  return (
    <AuthGuard>
      <LayoutWrapper>
        {children}
      </LayoutWrapper>
    </AuthGuard>
  )
}