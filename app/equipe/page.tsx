"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Users, BookOpen, Bug } from 'lucide-react'
import CourseAdminPanel from "@/components/course-admin-panel"
import UserAdminPanel from "@/components/user-admin-panel"
import { BugReportsAdmin } from "@/components/bug-reports-admin"

export default function Page() {
  // Se chegou aqui, já é admin (página restrita)
  const isAdmin = true

  return (
    <div className="min-h-screen bg-[#1a1b23] text-white p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              Administrativo
            </h1>
            <p className="text-gray-400 mt-2">
              Gerenciamento de usuários, cursos e bugs reportados
            </p>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-gray-800/50">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Cursos
            </TabsTrigger>
            <TabsTrigger value="bugs" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Bugs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserAdminPanel />
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <CourseAdminPanel />
          </TabsContent>
          
          <TabsContent value="bugs" className="mt-6">
            <BugReportsAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}