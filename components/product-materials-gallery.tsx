"use client"

import { useState, useEffect, useMemo } from "react"
import { useTaskData } from "./task-data"
import { getProductById } from "@/lib/products-db"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Plus,
  Search,
  Grid3X3,
  Grid2X2,
  Images,
  Upload,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  Video,
  FileImage,
  FileVideo,
  PlayCircle,
  Calendar,
  Tag,
  User
} from "lucide-react"
import MaterialViewerModal from "./material-viewer-modal"
import { MaterialUploadButton } from "./material-upload-button"
import { useToast } from "@/hooks/use-toast"

interface Material {
  id: string
  product_id: string
  title: string
  description?: string
  file_url: string
  file_type: string
  file_size?: number
  thumbnail_url?: string
  category: string
  tags?: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

interface ProductMaterialsGalleryProps {
  productId: string
  onBack: () => void
}

const CATEGORIES = [
  { value: "todos", label: "Todos", icon: Grid3X3 },
  { value: "banner", label: "Banners", icon: FileImage },
  { value: "upsell", label: "Upsells", icon: Tag },
  { value: "video", label: "Vídeos", icon: Video },
  { value: "gif", label: "GIFs", icon: PlayCircle },
  { value: "outros", label: "Outros", icon: Images }
]

const GRID_SIZES = [
  { value: "small", label: "Compacto", cols: "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" },
  { value: "medium", label: "Médio", cols: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" },
  { value: "large", label: "Grande", cols: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" }
]

export default function ProductMaterialsGallery({ productId, onBack }: ProductMaterialsGalleryProps) {
  const { members } = useTaskData()
  const { toast } = useToast()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [gridSize, setGridSize] = useState("medium")
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Get product info
  const product = getProductById(productId)

  // Load materials from database
  useEffect(() => {
    loadMaterials()
  }, [productId])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      // Load materials from database
      const { getMaterialsByProductId } = await import('@/lib/materials')
      const materialsFromDb = await getMaterialsByProductId(productId)

      // Ensure we always have a valid array
      const validMaterials = Array.isArray(materialsFromDb) ? materialsFromDb : []
      setMaterials(validMaterials)
    } catch (error) {
      console.error("Erro ao carregar materiais:", error)
      // Fallback to empty array instead of mock data
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMaterial = async (materialId: string, updates: Partial<Material>) => {
    try {
      // Update material in database
      const { updateMaterial } = await import('@/lib/materials')
      const updatedMaterial = await updateMaterial(materialId, updates)

      if (!updatedMaterial) {
        throw new Error('Material atualizado é null/undefined')
      }

      // Update local state - Strategy 1: Direct mapping
      setMaterials(prev => prev.map(material => {
        if (material.id === materialId) {
          return updatedMaterial
        }
        return material
      }))

      // Strategy 2: Reload from database as fallback
      setTimeout(async () => {
        try {
          const { getMaterialsByProductId } = await import('@/lib/materials')
          const freshMaterials = await getMaterialsByProductId(productId)
          setMaterials(freshMaterials)
        } catch (error) {
          console.error('Erro ao recarregar materiais:', error)
        }
      }, 200)

    } catch (error) {
      console.error('Erro ao atualizar material:', error)
      throw error
    }
  }

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      // Delete material from database
      const { deleteMaterial } = await import('@/lib/materials')
      await deleteMaterial(materialId)

      // Update local state
      setMaterials(prev => prev.filter(material => material.id !== materialId))

      console.log('Material deletado do banco:', materialId)
    } catch (error) {
      console.error('Erro ao deletar material:', error)
      throw error
    }
  }

  const handleUploadComplete = (newMaterials: Material[]) => {
    console.log('handleUploadComplete chamado com', newMaterials?.length || 0, 'materiais:', newMaterials)

    // Ensure newMaterials is a valid array
    const validNewMaterials = Array.isArray(newMaterials) ? newMaterials.filter(m => m && m.id) : []

    setMaterials(prev => {
      const validPrev = Array.isArray(prev) ? prev : []
      const updated = [...validPrev, ...validNewMaterials]
      console.log('Materiais atualizados:', updated)
      return updated
    })
  }

  // Direct upload function for drag & drop
  const handleDirectUpload = async (files: File[]) => {
    if (files.length === 0) return

    setIsUploading(true)
    try {
      // Obter token de autenticação
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.")
      }

      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('productId', productId)
        formData.append('title', file.name.replace(/\.[^/.]+$/, ""))
        formData.append('description', "")
        formData.append('category', "outros")
        formData.append('tags', "")

        const response = await fetch('/api/materials/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `HTTP ${response.status}`
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
          throw new Error(errorMessage)
        }

        const result = await response.json()
        if (!result.success || !result.material) {
          throw new Error(result.error || 'Upload failed')
        }

        return result.material
      })

      const newMaterials = await Promise.all(uploadPromises)
      handleUploadComplete(newMaterials)

      toast({
        title: "Upload concluído",
        description: `${newMaterials.length} material(is) foi(ram) carregado(s) com sucesso.`
      })

      // Recarregar a galeria após o upload
      setTimeout(() => {
        loadMaterials()
      }, 500)

    } catch (error) {
      console.error('Erro no upload direto:', error)
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro durante o upload dos materiais.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(file => {
      return file.type.startsWith('image/') ||
             file.type.startsWith('video/') ||
             file.type === 'application/pdf' ||
             file.type === 'text/html'
    })

    if (files.length > 0) {
      await handleDirectUpload(files)
    }
  }

  // Filter materials
  const filteredMaterials = useMemo(() => {
    // Ensure materials is always an array and filter out null/undefined items
    let filtered = (materials || []).filter(material => material && material.id)

    // Filter by category
    if (selectedCategory !== "todos") {
      filtered = filtered.filter(material => material.category === selectedCategory)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(material =>
        material.title?.toLowerCase().includes(term) ||
        material.description?.toLowerCase().includes(term) ||
        material.tags?.some(tag => tag.toLowerCase().includes(term))
      )
    }

    return filtered
  }, [materials, selectedCategory, searchTerm])

  const currentGridCols = GRID_SIZES.find(size => size.value === gridSize)?.cols || GRID_SIZES[1].cols

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70">Produto não encontrado</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "space-y-6 min-h-screen relative",
        isDragOver && "bg-blue-500/10 border-2 border-dashed border-blue-400"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm">
          <div className="text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-blue-400" />
            <p className="text-xl font-semibold text-blue-400">Solte os arquivos aqui para fazer upload</p>
            <p className="text-sm text-blue-300 mt-2">Suporte para imagens e vídeos</p>
          </div>
        </div>
      )}

      {/* Upload progress indicator */}
      {isUploading && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Fazendo upload...</span>
          </div>
        </div>
      )}
      {/* Upload Button */}
      <div className="flex justify-end">
        <MaterialUploadButton
          productId={productId}
          size="lg"
          onUploadSuccess={loadMaterials}
        />
      </div>

      {/* Materials Grid */}
      <div className="rounded-2xl border border-[#3A3A3C] bg-[#1F1F1F] p-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-[#2A2A2C] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-16">
            <Images className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm || selectedCategory !== "todos" ? "Nenhum material encontrado" : "Nenhum material ainda"}
            </h3>
            <p className="text-white/70 mb-6">
              Faça upload do primeiro material para este produto!
            </p>
          </div>
        ) : (
          <div className={cn("grid gap-4", currentGridCols)}>
            {filteredMaterials
              .filter(material => material && material.id) // Filter out null/undefined materials
              .map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  members={members}
                  onView={() => setSelectedMaterial(material)}
                  onUpdate={handleUpdateMaterial}
                  onDelete={handleDeleteMaterial}
                />
              ))}
          </div>
        )}
      </div>

      {/* Material Viewer Modal */}
      <MaterialViewerModal
        material={selectedMaterial}
        isOpen={!!selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
        onUpdate={handleUpdateMaterial}
        onDelete={handleDeleteMaterial}
        members={members}
      />

    </div>
  )
}

interface MaterialCardProps {
  material: Material
  members: any[]
  onView?: () => void
  onUpdate?: (materialId: string, updates: Partial<Material>) => Promise<void>
  onDelete?: (materialId: string) => Promise<void>
}

function MaterialCard({ material, members, onView, onUpdate, onDelete }: MaterialCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(material.title)
  const [isUpdating, setIsUpdating] = useState(false)

  const creator = material.created_by ? members.find(m => m.id === material.created_by) : null

  // Get the image URL directly from the material
  const getImageUrl = (url: string, fileType: string) => {
    if (!url) {
      return null
    }
    return url
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) return Video
    if (fileType.startsWith('image/')) return FileImage
    return Images
  }

  const FileIcon = getFileIcon(material.file_type)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(0)}KB` : `${mb.toFixed(1)}MB`
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "banner": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "upsell": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "video": return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "gif": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const handleTitleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditingTitle(material.title)
  }

  const handleTitleUpdate = async () => {
    if (!onUpdate || editingTitle.trim() === material.title || !editingTitle.trim()) {
      setIsEditing(false)
      setEditingTitle(material.title)
      return
    }

    setIsUpdating(true)
    try {
      await onUpdate(material.id, { title: editingTitle.trim() })
      setIsEditing(false)
    } catch (error) {
      console.error('Erro ao atualizar título:', error)
      setEditingTitle(material.title)
      setIsEditing(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!onDelete) return

    const confirmDelete = window.confirm(`Tem certeza que deseja excluir "${material.title}"?`)

    if (confirmDelete) {
      try {
        await onDelete(material.id)
      } catch (error) {
        console.error('Erro ao excluir material:', error)
        alert('Erro ao excluir o material. Tente novamente.')
      }
    }
  }

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      // Criar um link temporário para download forçado
      const link = document.createElement('a')
      link.href = material.file_url
      link.download = material.title || material.file_url.split('/').pop() || 'download'

      // Forçar download sem abrir nova aba
      link.style.display = 'none'

      // Adicionar ao DOM temporariamente e clicar
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)

      // Fallback: tentar fetch + blob
      try {
        const response = await fetch(material.file_url)
        const blob = await response.blob()

        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = material.title || material.file_url.split('/').pop() || 'download'
        link.style.display = 'none'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Limpar o objeto URL
        window.URL.revokeObjectURL(url)
      } catch (fetchError) {
        console.error('Erro no fallback de download:', fetchError)
        // Último recurso: abrir em nova aba
        window.open(material.file_url, '_blank')
      }
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditingTitle(material.title)
  }

  return (
    <div
      className="group relative bg-[#2A2A2C] rounded-lg overflow-hidden border border-[#3A3A3C] hover:border-[#4A4A4A] transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail/Preview */}
      <div className="aspect-square relative overflow-hidden bg-[#1A1A1A] flex items-center justify-center">
        {(() => {
          const imageUrl = getImageUrl(material.thumbnail_url || material.file_url, material.file_type)

          if (imageUrl && material.file_type.startsWith('image/')) {
            return (
              <img
                src={imageUrl}
                alt={material.title}
                className="w-full h-full object-cover"
              />
            )
          }

          return <FileIcon className="h-12 w-12 text-white/30" />
        })()}

        {/* Overlay with actions */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onView?.()
              }}
              title="Visualizar material"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={handleDownloadClick}
              title="Baixar material"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={handleEditClick}
              title="Renomear material"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0"
              onClick={handleDeleteClick}
              title="Excluir material"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* File type indicator */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            <FileIcon className="h-3 w-3 mr-1" />
            {material.file_type.split('/')[0]}
          </Badge>
        </div>

      </div>

      {/* Material Info */}
      <div className="p-3 space-y-2">
        {isEditing ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleTitleUpdate}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTitleUpdate()
              } else if (e.key === 'Escape') {
                setIsEditing(false)
                setEditingTitle(material.title)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={isUpdating}
            autoFocus
            className="w-full font-medium text-white text-sm bg-[#1A1A1A] border border-[#3A3A3C] focus:border-[#007AFF] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
          />
        ) : (
          <h3
            className="font-medium text-white text-sm line-clamp-1 cursor-pointer hover:text-blue-400 transition-colors"
            title={`${material.title} (clique duas vezes para editar)`}
            onDoubleClick={handleTitleEdit}
          >
            {material.title}
          </h3>
        )}

        {material.description && (
          <p className="text-xs text-white/60 line-clamp-2" title={material.description}>
            {material.description}
          </p>
        )}

        {/* Tags */}
        {material.tags && material.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {material.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs px-1 py-0 h-5">
                {tag}
              </Badge>
            ))}
            {material.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                +{material.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-white/40 pt-1">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(material.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <span>{formatFileSize(material.file_size)}</span>
        </div>
      </div>
    </div>
  )
}