"use client"

import { Play, Plus, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from "next/navigation"
import { safeFetch } from '@/lib/safe-fetch'
import { Button } from "@/components/ui/button"
import CourseAdminPanel from "@/components/course-admin-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  instructor: string | null
  category: string | null
  duration_minutes: number | null
  is_published: boolean
  lessons?: Array<{
    id: string
    title: string
  }>
}

interface CourseProgress {
  course_id: string
  progress_percentage: number
}

export default function CursosPage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("view")
  const router = useRouter()

  useEffect(() => {
    loadCourses()
    loadProgress()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await safeFetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const loadProgress = async () => {
    // Now the API returns empty array for non-authenticated users
    try {
      const response = await safeFetch('/api/courses/progress')
      
      if (response && response.ok) {
        const data = await response.json()
        
        const progressMap: Record<string, number> = {}
        
        for (const course of courses) {
          const courseProgressData = data.filter((p: any) => p.course_id === course.id)
          const totalLessons = course.lessons?.length || 0
          const completedLessons = courseProgressData.filter((p: any) => p.completed).length
          
          if (totalLessons > 0) {
            progressMap[course.id] = Math.round((completedLessons / totalLessons) * 100)
          }
        }
        
        setCourseProgress(progressMap)
      }
    } catch (error) {
      setCourseProgress({})
    }
  }

  const handleCourseClick = (courseId: string) => {
    router.push(`/cursos/${courseId}`)
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
  }

  // Filtrar apenas cursos publicados para visualização
  const publishedCourses = courses.filter(course => course.is_published)

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <div className="text-white">Carregando cursos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Cursos</h1>
            <p className="text-gray-400">Aprenda com os melhores do mercado</p>
          </div>
          
          {/* Botão para alternar entre visualização e administração */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "admin" ? "default" : "outline"}
              onClick={() => setActiveTab(activeTab === "view" ? "admin" : "view")}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium"
            >
              {activeTab === "view" ? (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Cursos
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ver Cursos
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-900/50 mb-6">
            <TabsTrigger value="view" className="data-[state=active]:bg-purple-600 text-white data-[state=active]:text-white">
              <Play className="h-4 w-4 mr-2" />
              Assistir Cursos
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-purple-600 text-white data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar
            </TabsTrigger>
          </TabsList>

          {/* Tab de Visualização */}
          <TabsContent value="view" className="mt-0">
            {publishedCourses.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 mb-4">Nenhum curso publicado ainda</p>
                <Button
                  onClick={() => setActiveTab("admin")}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Curso
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {publishedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="group relative cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10"
                    onMouseEnter={() => setHoveredCard(course.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleCourseClick(course.id)}
                  >
                    <div className="relative overflow-hidden rounded-md bg-zinc-900">
                      <div className="relative aspect-video">
                        {course.thumbnail_url ? (
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-purple-600 flex items-center justify-center">
                            <span className="text-white/50 text-lg font-medium">{course.title}</span>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">
                          {course.title}
                        </h3>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                          {course.lessons && course.lessons.length > 0 && (
                            <>
                              <span>{course.lessons.length} aulas</span>
                              <span>•</span>
                            </>
                          )}
                          {course.duration_minutes && (
                            <span>{formatDuration(course.duration_minutes)}</span>
                          )}
                        </div>

                        <p className={`text-gray-300 text-sm transition-all duration-300 ${
                          hoveredCard === course.id 
                            ? 'opacity-100 max-h-20 line-clamp-2' 
                            : 'opacity-0 max-h-0 overflow-hidden'
                        }`}>
                          {course.description || 'Sem descrição'}
                        </p>

                        {course.category && (
                          <div className="mt-3">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-900/50 text-purple-300 rounded">
                              {course.category}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                        <div 
                          className="h-full bg-purple-600 transition-all duration-300" 
                          style={{ width: `${courseProgress[course.id] || 0}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab de Administração */}
          <TabsContent value="admin" className="mt-0">
            <div className="bg-gray-900/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <Settings className="h-4 w-4" />
                <span className="font-medium">Painel de Administração</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Qualquer pessoa pode adicionar cursos e aulas. Apenas admins podem excluir.
              </p>
            </div>
            <CourseAdminPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}