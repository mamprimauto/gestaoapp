"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Save, Youtube, Video } from "lucide-react"
import { extractVimeoId } from "@/lib/vimeo-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LessonModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  editingLesson?: any
  selectedCourseId: string | null
}

// Helper function to extract YouTube video ID
function extractYoutubeId(url: string): string {
  // If it's already just an ID, return it
  if (!url.includes('/') && !url.includes('.')) {
    return url
  }
  
  // Extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return url
}

export function SimpleLessonModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingLesson,
  selectedCourseId 
}: LessonModalProps) {
  // Determine initial video type
  const initialVideoType = editingLesson?.video_type || 'vimeo'
  
  const [formData, setFormData] = useState({
    title: editingLesson?.title || "",
    description: editingLesson?.description || "",
    video_id: editingLesson?.video_id || "",
    video_type: initialVideoType,
    duration_seconds: editingLesson?.duration_seconds || 300
  })

  if (!isOpen) return null

  const handleSave = () => {
    if (!formData.title || !formData.video_id) {
      alert(`Por favor preencha o título e o link/ID do ${formData.video_type === 'youtube' ? 'YouTube' : 'Vimeo'}`)
      return
    }
    if (!selectedCourseId) {
      alert("Por favor selecione um curso")
      return
    }
    
    // Extract the video ID based on platform
    let videoId = formData.video_id
    if (formData.video_type === 'vimeo') {
      videoId = extractVimeoId(formData.video_id)
    } else if (formData.video_type === 'youtube') {
      videoId = extractYoutubeId(formData.video_id)
    }
    
    onSave({
      ...formData,
      video_id: videoId,
      video_type: formData.video_type,
      course_id: selectedCourseId,
      id: editingLesson?.id
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">
            {editingLesson ? 'Editar Aula' : 'Nova Aula'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Adicione as informações da aula
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título da Aula *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Ex: Introdução ao Marketing"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Breve descrição da aula..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="video_type">Plataforma do Vídeo *</Label>
            <Select
              value={formData.video_type}
              onValueChange={(value: 'vimeo' | 'youtube') => 
                setFormData({...formData, video_type: value, video_id: ''})
              }
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Selecione a plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    YouTube
                  </div>
                </SelectItem>
                <SelectItem value="vimeo">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-500" />
                    Vimeo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="video_id">
              Link ou ID do Vídeo no {formData.video_type === 'youtube' ? 'YouTube' : 'Vimeo'} *
            </Label>
            <Input
              id="video_id"
              value={formData.video_id}
              onChange={(e) => setFormData({...formData, video_id: e.target.value})}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder={
                formData.video_type === 'youtube' 
                  ? "Ex: https://youtube.com/watch?v=ABC123 ou ABC123"
                  : "Ex: https://vimeo.com/123456789 ou 123456789"
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Cole o link completo do {formData.video_type === 'youtube' ? 'YouTube' : 'Vimeo'} ou apenas o ID do vídeo
            </p>
          </div>

          <div>
            <Label htmlFor="duration">Duração (segundos)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration_seconds}
              onChange={(e) => setFormData({...formData, duration_seconds: parseInt(e.target.value) || 0})}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="300"
            />
            <p className="text-xs text-gray-500 mt-1">
              {Math.floor(formData.duration_seconds / 60)}:{(formData.duration_seconds % 60).toString().padStart(2, '0')} minutos
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!formData.title || !formData.video_id}
          >
            <Save className="h-4 w-4 mr-2" />
            {editingLesson ? 'Salvar Alterações' : 'Adicionar Aula'}
          </Button>
        </div>
      </div>
    </div>
  )
}