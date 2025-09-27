"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Upload, Check, X } from 'lucide-react'
import { useUploadProgress } from './upload-progress-context'
import { Button } from './ui/button'

export function UploadProgressModal() {
  const { uploadState, cancelUpload } = useUploadProgress()

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'avatar': return 'Avatar'
      case 'inspiration': return 'Inspiração'
      case 'entregavel': return 'Arquivo Entregável'
      default: return 'Arquivo'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'avatar': return 'text-blue-400'
      case 'inspiration': return 'text-purple-400'
      case 'entregavel': return 'text-green-400'
      default: return 'text-white'
    }
  }

  return (
    <Dialog open={uploadState.isUploading} onOpenChange={() => {}}>
      <DialogContent 
        className="bg-[#1F1F1F] border-[#3A3A3C] text-white max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {uploadState.progress === 100 ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <Upload className="h-5 w-5 text-blue-400" />
            )}
            {uploadState.progress === 100 ? 'Upload Concluído' : 'Enviando Arquivo'}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {uploadState.progress === 100 
              ? 'Seu arquivo foi enviado com sucesso'
              : 'Aguarde enquanto seu arquivo está sendo enviado'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Categoria do arquivo */}
          <div className="text-sm">
            <span className="text-white/60">Categoria: </span>
            <span className={getCategoryColor(uploadState.fileCategory)}>
              {getCategoryDisplayName(uploadState.fileCategory)}
            </span>
          </div>

          {/* Nome do arquivo */}
          <div className="text-sm">
            <span className="text-white/60">Arquivo: </span>
            <span className="text-white font-medium truncate block max-w-[280px]">
              {uploadState.fileName}
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Progresso</span>
              <span className="text-white font-medium">{uploadState.progress}%</span>
            </div>
            <Progress 
              value={uploadState.progress} 
              className="h-2 bg-[#2C2C2E]"
            />
          </div>

          {/* Status messages */}
          {uploadState.progress === 100 ? (
            <div className="text-sm text-green-400 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Arquivo enviado com sucesso!
            </div>
          ) : uploadState.progress > 0 ? (
            <div className="text-sm text-blue-400">
              Enviando arquivo...
            </div>
          ) : (
            <div className="text-sm text-white/60">
              Preparando upload...
            </div>
          )}

          {/* Cancel button - only show if upload is in progress but not completed */}
          {uploadState.progress > 0 && uploadState.progress < 100 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelUpload}
                className="border-[#3A3A3C] hover:bg-[#3A3A3C] text-white/80"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}