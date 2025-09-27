"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { SimpleLessonModal } from "./simple-lesson-modal"
import { PasswordModal } from "./password-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Video, 
  Clock,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Save,
  X,
  Upload,
  Link,
  User,
  Tag,
  PlayCircle,
  Image as ImageIcon,
  CheckCircle,
  XCircle
} from "lucide-react"

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  instructor: string | null
  category: string | null
  duration_minutes: number | null
  vimeo_folder_id: string | null
  order_index: number
  is_published: boolean
  created_at: string
  lessons?: Lesson[]
}

interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_id: string
  video_type?: 'vimeo' | 'youtube'
  duration_seconds: number | null
  order_index: number
}

const categories = [
  "Marketing Digital",
  "Copy",
  "Edição",
  "Gestão de Tráfego",
  "Design",
  "Vendas",
  "Mindset",
  "Ferramentas"
]

export default function CourseAdminPanel() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)
  
  // Modal states
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [selectedCourseForLesson, setSelectedCourseForLesson] = useState<string | null>(null)
  
  // Password protection states
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ type: 'course' | 'lesson', id: string, name?: string } | null>(null)
  
  // Form states
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    instructor: "",
    category: "Marketing Digital",
    duration_minutes: 60,
    vimeo_folder_id: "",
    is_published: false
  })
  
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    video_id: "",
    video_type: 'vimeo' as 'vimeo' | 'youtube',
    duration_seconds: 300
  })

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const handleSaveCourse = async () => {
    try {
      const url = editingCourse ? '/api/courses' : '/api/courses'
      const method = editingCourse ? 'PUT' : 'POST'
      
      const body = editingCourse 
        ? { id: editingCourse.id, ...courseForm }
        : courseForm

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await loadCourses()
        setIsCourseModalOpen(false)
        resetCourseForm()
      } else {
        const errorData = await response.json()

        alert(`Erro ao salvar curso: ${errorData.error || 'Erro desconhecido'}. 
        
Por favor, execute o script SQL: scripts/db/062_fix_all_policies.sql no Supabase para corrigir as permissões.`)
      }
    } catch (error) {

    }
  }

  const handleDeleteCourse = async (courseId: string, courseName?: string) => {
    // Armazenar o curso pendente para exclusão e abrir modal de senha
    setPendingDelete({ type: 'course', id: courseId, name: courseName })
    setPasswordModalOpen(true)
  }

  const executeDeleteCourse = async (courseId: string, password: string) => {
    try {
      const response = await fetch(`/api/courses?id=${courseId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Delete-Password': password // Enviar senha no header
        }
      })

      if (response.ok) {
        await loadCourses()
        alert('Curso excluído com sucesso!')
      } else {
        const error = await response.json()

        alert(`Erro ao excluir curso: ${error.error}`)
      }
    } catch (error) {

      alert('Erro ao excluir curso')
    }
  }

  const handleSaveLesson = async (data: any) => {
    // Se data for passado, usar data, senão usar lessonForm
    const formData = data || lessonForm
    const courseId = data?.course_id || selectedCourseForLesson
    
    if (!courseId) {
      alert('Por favor selecione um curso')
      return
    }

    try {
      const url = '/api/lessons'
      const method = (data?.id || editingLesson) ? 'PUT' : 'POST'
      
      const body = (data?.id || editingLesson)
        ? { id: data?.id || editingLesson.id, ...formData }
        : { ...formData, course_id: courseId }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await loadCourses()
        setIsLessonModalOpen(false)
        resetLessonForm()
      } else {
        const errorData = await response.json()

        alert(`Erro ao salvar aula: ${errorData.error || 'Erro desconhecido'}. 
        
${errorData.hint || 'Execute o script SQL: scripts/db/062_fix_all_policies.sql no Supabase para corrigir as permissões.'}`)
      }
    } catch (error) {

      alert('Erro ao salvar aula. Verifique o console para mais detalhes.')
    }
  }

  const handleDeleteLesson = async (lessonId: string, lessonName?: string) => {
    // Armazenar a aula pendente para exclusão e abrir modal de senha
    setPendingDelete({ type: 'lesson', id: lessonId, name: lessonName })
    setPasswordModalOpen(true)
  }

  const executeDeleteLesson = async (lessonId: string, password: string) => {
    try {
      const response = await fetch(`/api/lessons?id=${lessonId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Delete-Password': password // Enviar senha no header
        }
      })

      if (response.ok) {
        await loadCourses()
        alert('Aula excluída com sucesso!')
      } else {
        const error = await response.json()

        alert(`Erro ao excluir aula: ${error.error}`)
      }
    } catch (error) {

      alert('Erro ao excluir aula')
    }
  }

  const toggleCoursePublish = async (course: Course) => {
    try {
      const response = await fetch('/api/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: course.id,
          is_published: !course.is_published
        })
      })

      if (response.ok) {
        await loadCourses()
      }
    } catch (error) {

    }
  }

  const openCourseModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course)
      setCourseForm({
        title: course.title,
        description: course.description || "",
        thumbnail_url: course.thumbnail_url || "",
        instructor: course.instructor || "",
        category: course.category || "Marketing Digital",
        duration_minutes: course.duration_minutes || 60,
        vimeo_folder_id: course.vimeo_folder_id || "",
        is_published: course.is_published
      })
    } else {
      resetCourseForm()
    }
    setIsCourseModalOpen(true)
  }

  const openLessonModal = (courseId: string, lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson)
      setLessonForm({
        title: lesson.title,
        description: lesson.description || "",
        video_id: lesson.video_id,
        video_type: lesson.video_type || 'vimeo',
        duration_seconds: lesson.duration_seconds || 300
      })
    } else {
      // Para nova aula, resetar form mas manter o courseId
      setEditingLesson(null)
      setLessonForm({
        title: "",
        description: "",
        video_id: "",
        video_type: 'vimeo' as 'vimeo' | 'youtube',
        duration_seconds: 300
      })
    }
    setSelectedCourseForLesson(courseId) // Definir courseId DEPOIS de resetar
    setIsLessonModalOpen(true)
  }

  const resetCourseForm = () => {
    setEditingCourse(null)
    setCourseForm({
      title: "",
      description: "",
      thumbnail_url: "",
      instructor: "",
      category: "Marketing Digital",
      duration_minutes: 60,
      vimeo_folder_id: "",
      is_published: false
    })
  }

  const resetLessonForm = () => {
    setEditingLesson(null)
    setSelectedCourseForLesson(null)
    setLessonForm({
      title: "",
      description: "",
      video_id: "",
      video_type: 'vimeo' as 'vimeo' | 'youtube',
      duration_seconds: 300
    })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A"
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
  }

  const formatLessonDuration = (seconds: number | null) => {
    if (!seconds) return "N/A"
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Carregando cursos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Course Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gerenciar Cursos</h2>
          <p className="text-gray-400 mt-1">
            Adicione e gerencie cursos e aulas da plataforma
          </p>
        </div>
        <Button 
          onClick={() => openCourseModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Curso
        </Button>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <Card className="bg-gray-800/30 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-gray-500 mb-4" />
            <p className="text-gray-400 text-lg mb-4">Nenhum curso cadastrado</p>
            <Button 
              onClick={() => openCourseModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Curso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="bg-gray-800/30 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
                      {course.thumbnail_url ? (
                        <img 
                          src={course.thumbnail_url} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-500" />
                      )}
                    </div>

                    {/* Course Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl text-white">
                          {course.title}
                        </CardTitle>
                        <Badge 
                          variant={course.is_published ? "default" : "secondary"}
                          className={course.is_published 
                            ? "bg-green-500/20 text-green-400 border-green-500/50" 
                            : "bg-gray-500/20 text-gray-400 border-gray-500/50"
                          }
                        >
                          {course.is_published ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Publicado
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Rascunho
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      {course.description && (
                        <CardDescription className="text-gray-400 mb-3">
                          {course.description}
                        </CardDescription>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        {course.instructor && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {course.instructor}
                          </div>
                        )}
                        {course.category && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {course.category}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(course.duration_minutes)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          {course.lessons?.length || 0} aulas
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCoursePublish(course)}
                      className="hover:bg-gray-700"
                    >
                      {course.is_published ? (
                        <XCircle className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCourseModal(course)}
                      className="hover:bg-gray-700"
                    >
                      <Edit2 className="h-4 w-4 text-blue-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      className="hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedCourseId(
                        expandedCourseId === course.id ? null : course.id
                      )}
                      className="hover:bg-gray-700"
                    >
                      {expandedCourseId === course.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Lessons Section */}
              {expandedCourseId === course.id && (
                <CardContent className="pt-0">
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <PlayCircle className="h-5 w-5" />
                        Aulas do Curso
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => openLessonModal(course.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Nova Aula
                      </Button>
                    </div>

                    {course.lessons && course.lessons.length > 0 ? (
                      <div className="space-y-2">
                        {course.lessons
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((lesson, index) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <GripVertical className="h-4 w-4" />
                                  <span className="font-mono text-sm">
                                    {(index + 1).toString().padStart(2, '0')}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-white">
                                    {lesson.title}
                                  </p>
                                  {lesson.description && (
                                    <p className="text-sm text-gray-400 mt-1">
                                      {lesson.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Video className="h-3 w-3" />
                                      {lesson.video_type === 'youtube' ? 'YouTube' : 'Vimeo'} ID: {lesson.video_id}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatLessonDuration(lesson.duration_seconds)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openLessonModal(course.id, lesson)}
                                  className="hover:bg-gray-700"
                                >
                                  <Edit2 className="h-3 w-3 text-blue-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                  className="hover:bg-gray-700"
                                >
                                  <Trash2 className="h-3 w-3 text-red-400" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-900/30 rounded-lg border border-gray-700">
                        <Video className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                          Nenhuma aula cadastrada
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openLessonModal(course.id)}
                          className="mt-2 text-purple-400 hover:text-purple-300"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar primeira aula
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Course Modal */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? 'Editar Curso' : 'Novo Curso'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do curso
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título do Curso *</Label>
                <Input
                  id="title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                  placeholder="Ex: Curso de Copy Avançado"
                />
              </div>
              <div>
                <Label htmlFor="instructor">Instrutor</Label>
                <Input
                  id="instructor"
                  value={courseForm.instructor}
                  onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                  placeholder="Nome do instrutor"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="bg-gray-800 border-gray-700"
                placeholder="Descreva o conteúdo do curso..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select 
                  value={courseForm.category} 
                  onValueChange={(value) => setCourseForm({ ...courseForm, category: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={courseForm.duration_minutes}
                  onChange={(e) => setCourseForm({ ...courseForm, duration_minutes: parseInt(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                  placeholder="60"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="thumbnail">URL da Thumbnail</Label>
              <Input
                id="thumbnail"
                value={courseForm.thumbnail_url}
                onChange={(e) => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
                className="bg-gray-800 border-gray-700"
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>

            <div>
              <Label htmlFor="vimeo_folder">ID da Pasta Vimeo (opcional)</Label>
              <Input
                id="vimeo_folder"
                value={courseForm.vimeo_folder_id}
                onChange={(e) => setCourseForm({ ...courseForm, vimeo_folder_id: e.target.value })}
                className="bg-gray-800 border-gray-700"
                placeholder="ID da pasta no Vimeo"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={courseForm.is_published}
                onCheckedChange={(checked) => setCourseForm({ ...courseForm, is_published: checked })}
              />
              <Label>Publicar curso imediatamente</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCourseModalOpen(false)}
              className="bg-gray-800 border-gray-700"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCourse}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!courseForm.title}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingCourse ? 'Salvar Alterações' : 'Criar Curso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Modal */}
      <SimpleLessonModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false)
          // Não chamar resetLessonForm aqui para manter o selectedCourseForLesson
          setEditingLesson(null)
          setLessonForm({
            title: "",
            description: "",
            video_id: "",
            video_type: 'vimeo' as 'vimeo' | 'youtube',
            duration_seconds: 300
          })
        }}
        onSave={handleSaveLesson}
        editingLesson={editingLesson}
        selectedCourseId={selectedCourseForLesson}
      />

      {/* Password Modal */}
      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false)
          setPendingDelete(null)
        }}
        onConfirm={async (password) => {
          if (pendingDelete) {
            if (pendingDelete.type === 'course') {
              await executeDeleteCourse(pendingDelete.id, password)
            } else {
              await executeDeleteLesson(pendingDelete.id, password)
            }
            setPasswordModalOpen(false)
            setPendingDelete(null)
          }
        }}
        title={pendingDelete?.type === 'course' ? 'Excluir Curso' : 'Excluir Aula'}
        message={`Você está prestes a excluir ${pendingDelete?.type === 'course' ? 'o curso' : 'a aula'} "${pendingDelete?.name || ''}". Esta ação não pode ser desfeita. Digite a senha de administrador para confirmar.`}
      />
    </div>
  )
}