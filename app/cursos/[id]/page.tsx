"use client"

import { useState, useEffect, useRef } from "react"
import { getSupabaseClient } from '@/lib/supabase/client'
import { ChevronLeft, Check, Play, Lock, CheckCircle, Sparkles, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"
import Player from '@vimeo/player'

interface Lesson {
  id: string
  title: string
  description: string | null
  video_id: string
  video_type?: 'vimeo' | 'youtube'
  duration_seconds: number | null
  order_index: number
}

interface Course {
  id: string
  title: string
  description: string | null
  instructor: string | null
  category: string | null
  lessons: Lesson[]
}

interface LessonProgress {
  lesson_id: string
  completed: boolean
  last_position?: number
}

interface CompletedUser {
  userId: string
  completedAt: string
  name: string
  email?: string
  avatarUrl?: string
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({})
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)
  const [lastViewedLesson, setLastViewedLesson] = useState<string | null>(null)
  const [completedUsers, setCompletedUsers] = useState<CompletedUser[]>([])
  const [loadingCompletions, setLoadingCompletions] = useState(false)
  const playerRef = useRef<Player | null>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      await checkAuth()
      await loadProgress()
      await loadCourse()
    }
    init()
    
    return () => {
      saveLocalProgress()
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [params.id])

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveLocalProgress()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveLocalProgress()
    }
  }, [lessonProgress])

  useEffect(() => {
    if (currentLesson && playerContainerRef.current) {
      initializePlayer()
      // Carregar lista de pessoas que completaram esta aula
      loadCompletedUsers(currentLesson.id)
    }
  }, [currentLesson])

  const checkAuth = async () => {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase?.auth) {

        setIsAuthenticated(false)
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      const authenticated = !!session?.user
      setIsAuthenticated(authenticated)

      if (authenticated && session.user) {

      }
    } catch (err) {

      setIsAuthenticated(false)
    }
  }

  const saveLocalProgress = () => {
    if (course) {
      localStorage.setItem(`course_progress_${params.id}`, JSON.stringify(lessonProgress))
      // Also save the last viewed lesson
      if (currentLesson) {
        localStorage.setItem(`last_lesson_${params.id}`, currentLesson.id)
      }
    }
  }

  const saveVideoPosition = (position: number) => {
    if (!currentLesson) return
    
    const newProgress = {
      ...lessonProgress,
      [currentLesson.id]: {
        ...lessonProgress[currentLesson.id],
        last_position: Math.floor(position)
      }
    }
    setLessonProgress(newProgress)
    
    // Save to localStorage immediately - this is the primary storage
    localStorage.setItem(`course_progress_${params.id}`, JSON.stringify(newProgress))
    
    // Note: Database sync would happen here if authenticated, but localStorage is sufficient
  }

  const loadCompletedUsers = async (lessonId: string) => {
    setLoadingCompletions(true)
    try {
      // Carregar usuários do banco de dados
      const response = await fetch(`/api/courses/completions?lessonId=${lessonId}`)
      let dbUsers: CompletedUser[] = []
      
      if (response.ok) {
        dbUsers = await response.json()
      }
      
      // Verificar progresso local atualizado
      const localProgress = lessonProgress[lessonId]

      // Adicionar usuário local se completou (não autenticado)
      if (!isAuthenticated && localProgress?.completed) {
        // Adicionar o usuário local à lista
        const localUser: CompletedUser = {
          userId: 'local-user',
          completedAt: new Date().toISOString(),
          name: 'Você (não logado)',
          email: undefined,
          avatarUrl: undefined
        }

        // Combinar com usuários do banco, colocando o local primeiro
        setCompletedUsers([localUser, ...dbUsers])
      } else {
        setCompletedUsers(dbUsers)
      }
    } catch (error) {

      setCompletedUsers([])
    } finally {
      setLoadingCompletions(false)
    }
  }

  const loadCourse = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        const foundCourse = data.find((c: Course) => c.id === params.id)
        if (foundCourse) {
          setCourse(foundCourse)
          
          const sortedLessons = [...(foundCourse.lessons || [])].sort(
            (a, b) => a.order_index - b.order_index
          )
          
          if (sortedLessons.length > 0) {
            // Try to get the last viewed lesson from localStorage
            const lastLessonId = localStorage.getItem(`last_lesson_${params.id}`)
            
            if (lastLessonId) {
              // Find the last viewed lesson
              const lastLesson = sortedLessons.find(l => l.id === lastLessonId)
              if (lastLesson) {
                setCurrentLesson(lastLesson)
                setLoading(false)
                return
              }
            }
            
            // If no last viewed lesson, try to find the first incomplete lesson
            const firstIncomplete = sortedLessons.find(l => !lessonProgress[l.id]?.completed)
            if (firstIncomplete) {
              setCurrentLesson(firstIncomplete)
            } else {
              // If all lessons are complete or no progress, start from the first
              setCurrentLesson(sortedLessons[0])
            }
          }
        }
      }
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const loadProgress = async () => {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem(`course_progress_${params.id}`)
      let localProgress: Record<string, LessonProgress> = {}
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Convert to simplified format
          Object.keys(parsed).forEach(key => {
            localProgress[key] = {
              lesson_id: key,
              completed: parsed[key].completed || false,
              last_position: parsed[key].last_position || 0
            }
          })
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Try to load from API if authenticated
      if (isAuthenticated) {
        const response = await fetch(`/api/courses/progress?courseId=${params.id}`)
        if (response.ok) {
          const data = await response.json()
          const progressMap: Record<string, LessonProgress> = {}
          data.forEach((p: any) => {
            progressMap[p.lesson_id] = {
              lesson_id: p.lesson_id,
              completed: p.completed || false,
              last_position: p.last_position_seconds || localProgress[p.lesson_id]?.last_position || 0
            }
          })
          
          // Merge local and remote (remote takes precedence for completed status, merge positions)
          const merged: Record<string, LessonProgress> = { ...localProgress }
          Object.keys(progressMap).forEach(key => {
            merged[key] = {
              ...merged[key],
              ...progressMap[key],
              // Keep local position if API doesn't have it
              last_position: progressMap[key].last_position || localProgress[key]?.last_position || 0
            }
          })
          setLessonProgress(merged)
        } else {
          setLessonProgress(localProgress)
        }
      } else {
        setLessonProgress(localProgress)
      }
    } catch (error) {
      // Use localStorage as fallback
      const stored = localStorage.getItem(`course_progress_${params.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          const localProgress: Record<string, LessonProgress> = {}
          Object.keys(parsed).forEach(key => {
            localProgress[key] = {
              lesson_id: key,
              completed: parsed[key].completed || false,
              last_position: parsed[key].last_position || 0
            }
          })
          setLessonProgress(localProgress)
        } catch (e) {
          setLessonProgress({})
        }
      } else {
        setLessonProgress({})
      }
    }
  }

  const initializePlayer = async () => {
    if (!currentLesson || !playerContainerRef.current) return

    if (playerRef.current) {
      playerRef.current.destroy()
    }

    playerContainerRef.current.innerHTML = ''

    // Determine video ID and type
    const videoId = currentLesson.video_id
    const videoType = currentLesson.video_type || 'vimeo'
    
    if (!videoId) {

      return
    }

    const iframe = document.createElement('iframe')
    
    if (videoType === 'youtube') {
      // YouTube embed URL with autoplay and controls
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1`
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
    } else {
      // Vimeo embed URL (existing code)
      iframe.src = `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`
      iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; clipboard-write')
    }
    
    iframe.width = '100%'
    iframe.height = '100%'
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('allowfullscreen', 'true')
    playerContainerRef.current.appendChild(iframe)

    // Initialize player based on type
    if (videoType === 'vimeo') {
      const player = new Player(iframe)
      playerRef.current = player

      // Resume from saved position if not completed
      const progress = lessonProgress[currentLesson.id]
      if (progress && progress.last_position && progress.last_position > 0 && !progress.completed) {
        setTimeout(() => {
          player.setCurrentTime(progress.last_position).then(() => {

          }).catch(() => {})
        }, 500)
      }

      // Save position every 5 seconds
      let lastSaveTime = 0
      player.on('timeupdate', (data) => {
        const currentTime = data.seconds
        if (currentTime - lastSaveTime > 5) {
          lastSaveTime = currentTime
          saveVideoPosition(currentTime)
        }
      })

      // Save position on pause
      player.on('pause', (data) => {
        saveVideoPosition(data.seconds)
      })

      // Save position on seek
      player.on('seeked', (data) => {
        saveVideoPosition(data.seconds)
      })

      player.on('ended', () => {
        markLessonComplete(true)
      })
    } else if (videoType === 'youtube') {
      // For YouTube, we'll use a simpler approach
      // YouTube API requires more setup, so we'll just handle completion manually

      // Add a manual completion button for YouTube videos
      // since we can't easily track YouTube player events without the YouTube API
    }
  }

  const markLessonComplete = async (autoAdvance = true) => {
    if (!currentLesson) return

    // Update UI immediately - clear position when completing
    const newProgress = {
      ...lessonProgress,
      [currentLesson.id]: {
        lesson_id: currentLesson.id,
        completed: true,
        last_position: 0 // Reset position when completed
      }
    }
    
    // Save to localStorage FIRST
    localStorage.setItem(`course_progress_${params.id}`, JSON.stringify(newProgress))
    
    // Update state
    setLessonProgress(newProgress)

    // Show congratulations
    setShowCongrats(true)
    
    // Recarregar lista com pequeno delay para garantir que o estado foi atualizado
    setTimeout(() => {
      loadCompletedUsers(currentLesson.id)
    }, 100)
    
    // Try to save to database only if authenticated
    if (isAuthenticated) {
      try {
        // Get the session token to send with the request
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        const headers: any = { 'Content-Type': 'application/json' }
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
        
        const response = await fetch('/api/courses/progress', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            lesson_id: currentLesson.id,
            completed: true,
            progress_percentage: 100
          })
        })
        
        if (response.ok) {

          // Recarregar a lista após salvar com sucesso
          setTimeout(() => {
            loadCompletedUsers(currentLesson.id)
          }, 500)
        } else {

        }
      } catch (error) {

      }
    } else {

    }
    
    // Auto advance
    if (autoAdvance) {
      const sortedLessons = [...(course?.lessons || [])].sort(
        (a, b) => a.order_index - b.order_index
      )
      const currentIndex = sortedLessons.findIndex(l => l.id === currentLesson.id)
      if (currentIndex < sortedLessons.length - 1) {
        if (playerRef.current) {
          playerRef.current.pause().catch(() => {})
        }
        setTimeout(() => {
          setShowCongrats(false)
          const nextLesson = sortedLessons[currentIndex + 1]
          setCurrentLesson(nextLesson)
          // Save the last viewed lesson when auto-advancing
          localStorage.setItem(`last_lesson_${params.id}`, nextLesson.id)
        }, 2000)
      } else {
        setTimeout(() => setShowCongrats(false), 3000)
      }
    } else {
      setTimeout(() => setShowCongrats(false), 3000)
    }
  }

  const toggleLessonComplete = async () => {
    if (!currentLesson) return

    const isCurrentlyCompleted = lessonProgress[currentLesson.id]?.completed || false
    
    if (isCurrentlyCompleted) {
      // Unmark - keep the last position
      const newProgress = {
        ...lessonProgress,
        [currentLesson.id]: {
          lesson_id: currentLesson.id,
          completed: false,
          last_position: lessonProgress[currentLesson.id]?.last_position || 0
        }
      }
      setLessonProgress(newProgress)
      localStorage.setItem(`course_progress_${params.id}`, JSON.stringify(newProgress))
      
      if (isAuthenticated) {
        try {
          await fetch('/api/courses/progress', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lesson_id: currentLesson.id,
              completed: false
            })
          })
        } catch (error) {
          // Silently ignore
        }
      }
    } else {
      markLessonComplete(true)
    }
  }

  const handleLessonClick = (lesson: Lesson) => {
    if (playerRef.current) {
      playerRef.current.pause()
    }
    setShowCongrats(false)
    setCurrentLesson(lesson)
    // Save the last viewed lesson immediately
    localStorage.setItem(`last_lesson_${params.id}`, lesson.id)
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando curso...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Curso não encontrado</div>
      </div>
    )
  }

  const sortedLessons = [...(course.lessons || [])].sort(
    (a, b) => a.order_index - b.order_index
  )

  return (
    <div className="min-h-screen bg-black">
      <div className="flex flex-col lg:flex-row h-screen">
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={() => router.push('/cursos')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar aos cursos</span>
            </button>
            
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
            {course.instructor && (
              <p className="text-gray-400 text-sm mt-1">Instrutor: {course.instructor}</p>
            )}
          </div>

          <div className="flex-1 bg-black p-4">
            <div className="relative">
              <div 
                ref={playerContainerRef}
                className="w-full aspect-video bg-zinc-900 rounded-lg overflow-hidden"
              />
              
              {/* Congratulations Message */}
              {showCongrats && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg animate-fade-in">
                  <div className="text-center p-8 bg-gradient-to-br from-purple-900/90 to-purple-600/90 rounded-2xl backdrop-blur-sm">
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                        <CheckCircle className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Parabéns!</h2>
                    <p className="text-lg text-white/90 mb-4">Você completou esta aula!</p>
                    <div className="flex items-center justify-center gap-2 text-yellow-400">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-semibold">Excelente progresso!</span>
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {currentLesson && (
              <div className="mt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {currentLesson.title}
                    </h2>
                    {currentLesson.description && (
                      <p className="text-gray-400">{currentLesson.description}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={toggleLessonComplete}
                    className={`ml-4 px-4 py-2 rounded-lg flex items-center gap-2 transition-all transform ${
                      lessonProgress[currentLesson.id]?.completed
                        ? 'bg-green-600 hover:bg-green-700 text-white scale-105'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700'
                    }`}
                  >
                    {lessonProgress[currentLesson.id]?.completed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {lessonProgress[currentLesson.id]?.completed ? 'Aula Completa ✓' : 'Marcar como Completa'}
                    </span>
                  </button>
                </div>
                
                {!isAuthenticated && (
                  <div className="mt-3 text-xs text-yellow-500">
                    ⚠️ Progresso salvo localmente (faça login para sincronizar)
                  </div>
                )}
                
                {/* Lista de pessoas que completaram */}
                <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Quem já completou esta aula ({completedUsers.length})
                  </h3>
                  
                  {loadingCompletions ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      Carregando...
                    </div>
                  ) : completedUsers.length > 0 ? (
                    <div className="space-y-2">
                      {/* Mostrar avatares dos primeiros 10 usuários */}
                      <div className="flex flex-wrap gap-2">
                        {completedUsers.slice(0, 10).map((user) => (
                          <div
                            key={user.userId}
                            className="group relative"
                          >
                            <div className={`w-10 h-10 rounded-full ${
                              user.userId === 'local-user' 
                                ? 'bg-gradient-to-br from-yellow-500 to-orange-600' 
                                : 'bg-gradient-to-br from-blue-500 to-purple-600'
                            } p-0.5`}>
                              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
                                {user.avatarUrl ? (
                                  <img 
                                    src={user.avatarUrl} 
                                    alt={user.name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : user.userId === 'local-user' ? (
                                  '⭐'
                                ) : (
                                  user.name.charAt(0).toUpperCase()
                                )}
                              </div>
                            </div>
                            {/* Tooltip com nome e data */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              <div className="font-semibold">{user.name}</div>
                              <div className="text-gray-400">
                                {user.userId === 'local-user' ? 'Agora mesmo' : new Date(user.completedAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        ))}
                        {completedUsers.length > 10 && (
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                            +{completedUsers.length - 10}
                          </div>
                        )}
                      </div>
                      
                      {/* Lista completa (primeiros 5 com nomes) */}
                      <div className="mt-3 space-y-1">
                        {completedUsers.slice(0, 5).map((user) => (
                          <div key={user.userId} className="flex items-center gap-2 text-xs text-gray-400">
                            <Check className={`w-3 h-3 ${user.userId === 'local-user' ? 'text-yellow-500' : 'text-green-500'}`} />
                            <span className={`font-medium ${user.userId === 'local-user' ? 'text-yellow-400' : 'text-gray-300'}`}>
                              {user.name}
                            </span>
                            <span>
                              {user.userId === 'local-user' 
                                ? 'completou agora mesmo' 
                                : `completou em ${new Date(user.completedAt).toLocaleDateString('pt-BR')}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Seja o primeiro a completar esta aula! 🎯
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-96 bg-zinc-900 border-l border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white">Conteúdo do curso</h3>
            <p className="text-sm text-gray-400 mt-1">
              {sortedLessons.length} aulas
              {sortedLessons.filter(l => lessonProgress[l.id]?.completed).length > 0 && (
                <span className="ml-2 text-green-500">
                  • {sortedLessons.filter(l => lessonProgress[l.id]?.completed).length} completas
                </span>
              )}
            </p>
          </div>

          <div className="p-2">
            {sortedLessons.map((lesson, index) => {
              const isActive = currentLesson?.id === lesson.id
              const isCompleted = lessonProgress[lesson.id]?.completed || false

              return (
                <div
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson)}
                  className={`
                    p-3 rounded-lg mb-2 cursor-pointer transition-all
                    ${isActive 
                      ? 'bg-purple-900/30 border border-purple-600' 
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-zinc-600 flex items-center justify-center">
                          <Play className="w-3 h-3 text-zinc-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className={`font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                          {index + 1}. {lesson.title}
                        </h4>
                        {lesson.duration_seconds && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatDuration(lesson.duration_seconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}