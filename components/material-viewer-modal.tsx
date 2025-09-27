"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Download,
  Trash2,
  FileImage,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react"
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

interface MaterialViewerModalProps {
  material: Material | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (materialId: string, updates: Partial<Material>) => Promise<void>
  onDelete?: (materialId: string) => Promise<void>
  members?: any[]
}


export default function MaterialViewerModal({
  material,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  members = []
}: MaterialViewerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const { toast } = useToast()

  if (!material) {
    return null
  }

  // Get the image URL directly
  const getWorkingImageUrl = (url: string) => {
    return url
  }

  const isImage = material.file_type.startsWith('image/')
  const isVideo = material.file_type.startsWith('video/')

  const handleDelete = async () => {
    if (!onDelete) return

    if (!confirm(`Tem certeza que deseja excluir "${material.title}"?`)) return

    setIsLoading(true)
    try {
      await onDelete(material.id)
      onClose()
      toast({
        title: "Material excluído",
        description: "O material foi removido com sucesso."
      })
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o material.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = material.file_url
    link.download = material.title
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl sm:max-w-6xl md:max-w-6xl lg:max-w-6xl xl:max-w-6xl max-h-[90vh] bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C] flex flex-col">
        <DialogHeader className="pb-4 border-b border-[#2A2A2C]">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {material.title}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Visualizar material da galeria
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls for images */}
              {isImage && (
                <div className="flex items-center gap-1 mr-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs px-2">{zoom}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="border-[#3A3A3C] hover:bg-[#3A3A3C]"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>

              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Media Viewer - Full Width */}
        <div className="flex-1 flex items-center justify-center bg-[#000] rounded-lg overflow-hidden">
          {isImage ? (
            <img
              src={getWorkingImageUrl(material.file_url)}
              alt={material.title}
              className="max-w-full max-h-full object-contain transition-all duration-200"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`
              }}
            />
          ) : isVideo ? (
            <video
              src={material.file_url}
              controls
              className="max-w-full max-h-full"
            >
              Seu navegador não suporta o elemento de vídeo.
            </video>
          ) : (
            <div className="text-center text-white/60">
              <FileImage className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Prévia não disponível</p>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="mt-4"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}