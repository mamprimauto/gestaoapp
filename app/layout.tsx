import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"

import ConditionalAuthLayout from "@/components/conditional-auth-layout"
import { TaskDataProvider } from "@/components/task-data"
import { DateProvider } from "@/components/date-context"
import { UploadProgressProvider } from "@/components/upload-progress-context"
import { UploadProgressModal } from "@/components/upload-progress-modal"
import { UploadQueueProvider } from "@/components/upload-queue-context"
import { UploadPanel } from "@/components/upload-panel"
import { TimeSyncProvider } from "@/hooks/use-time-sync"
import { ConnectionStatus } from "@/components/connection-status"

export const metadata: Metadata = {
  title: "Spected Team",
  description: "Team task management dashboard",
  generator: "v0.dev",
}

const inter = Inter({ subsets: ["latin"], display: "swap" })

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.className}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PUBLIC_ENV__ = ${JSON.stringify(publicEnv)};`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <DateProvider>
            <TimeSyncProvider>
              <UploadQueueProvider>
                <UploadProgressProvider>
                  <TaskDataProvider>
                    <ConditionalAuthLayout>
                      {children}
                    </ConditionalAuthLayout>
                  </TaskDataProvider>
                  <UploadProgressModal />
                  <UploadPanel />
                  <ConnectionStatus />
                  <Toaster />
                  <SonnerToaster theme="dark" richColors position="bottom-right" />
                </UploadProgressProvider>
              </UploadQueueProvider>
            </TimeSyncProvider>
          </DateProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}