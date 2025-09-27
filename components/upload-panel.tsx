"use client"

import React, { useState } from 'react'
import { useUploadQueue, UploadItem, UploadStatus } from './upload-queue-context'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  ChevronUp, 
  ChevronDown, 
  X, 
  Pause, 
  Play, 
  RotateCcw, 
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`
}

function formatETA(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}

function getStatusIcon(status: UploadStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'uploading':
      return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
    case 'paused':
      return <Pause className="h-4 w-4 text-yellow-500" />
    case 'pending':
      return <Clock className="h-4 w-4 text-gray-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

function getStatusColor(status: UploadStatus): string {
  switch (status) {
    case 'completed':
      return 'text-green-500'
    case 'failed':
    case 'cancelled':
      return 'text-red-500'
    case 'uploading':
      return 'text-blue-500'
    case 'paused':
      return 'text-yellow-500'
    case 'pending':
      return 'text-gray-500'
    default:
      return 'text-gray-500'
  }
}

function UploadItemComponent({ upload }: { upload: UploadItem }) {
  const { pauseUpload, resumeUpload, cancelUpload, retryUpload, removeUpload } = useUploadQueue()

  const handleAction = (action: string) => {
    switch (action) {
      case 'pause':
        pauseUpload(upload.id)
        break
      case 'resume':
        resumeUpload(upload.id)
        break
      case 'cancel':
        cancelUpload(upload.id)
        break
      case 'retry':
        retryUpload(upload.id)
        break
      case 'remove':
        removeUpload(upload.id)
        break
    }
  }

  return (
    <div className="p-3 border-b border-[#3A3A3C] last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon(upload.status)}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white truncate pr-2">
              {upload.fileName}
            </span>
            <div className="flex items-center gap-1">
              {/* Action Buttons */}
              {upload.status === 'uploading' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-yellow-500/20"
                  onClick={() => handleAction('pause')}
                  title="Pausar"
                >
                  <Pause className="h-3 w-3" />
                </Button>
              )}
              
              {upload.status === 'paused' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-blue-500/20"
                  onClick={() => handleAction('resume')}
                  title="Retomar"
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              
              {(upload.status === 'failed' || upload.status === 'cancelled') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-green-500/20"
                  onClick={() => handleAction('retry')}
                  title="Tentar novamente"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              
              {(upload.status === 'uploading' || upload.status === 'pending') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-red-500/20"
                  onClick={() => handleAction('cancel')}
                  title="Cancelar"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              
              {(upload.status === 'completed' || upload.status === 'failed' || upload.status === 'cancelled') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-gray-500/20"
                  onClick={() => handleAction('remove')}
                  title="Remover"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {(upload.status === 'uploading' || upload.status === 'paused' || upload.status === 'pending') && (
            <div className="mb-2">
              <Progress value={upload.progress} className="h-2 bg-[#2C2C2E]" />
            </div>
          )}

          {/* Status Info */}
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <span className={cn("font-medium", getStatusColor(upload.status))}>
                {upload.status === 'completed' && 'Concluído'}
                {upload.status === 'failed' && 'Falhou'}
                {upload.status === 'cancelled' && 'Cancelado'}
                {upload.status === 'uploading' && `${Math.round(upload.progress)}%`}
                {upload.status === 'paused' && 'Pausado'}
                {upload.status === 'pending' && 'Aguardando'}
              </span>
              
              {upload.status === 'uploading' && upload.speed && (
                <span>• {formatSpeed(upload.speed)}</span>
              )}
              
              {upload.status === 'uploading' && upload.eta && (
                <span>• {formatETA(upload.eta)} restante</span>
              )}
            </div>
            
            <span>{formatFileSize(upload.fileSize)}</span>
          </div>

          {/* Error Message */}
          {upload.error && (
            <div className="mt-1 text-xs text-red-400">
              {upload.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function UploadPanel() {
  const { 
    uploads, 
    activeUploads, 
    isVisible, 
    toggleVisibility, 
    clearCompleted 
  } = useUploadQueue()
  
  const [isExpanded, setIsExpanded] = useState(true)

  // Don't render if no uploads
  if (uploads.length === 0) return null

  const activeCount = uploads.filter(u => u.status === 'uploading' || u.status === 'pending').length
  const completedCount = uploads.filter(u => u.status === 'completed').length
  const failedCount = uploads.filter(u => u.status === 'failed' || u.status === 'cancelled').length

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 bg-[#1F1F1F] border border-[#3A3A3C] rounded-lg shadow-2xl",
        "transition-all duration-300 ease-in-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none",
        "w-80 max-w-[calc(100vw-2rem)]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#3A3A3C]">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-white">
            Uploads {activeCount > 0 && `(${activeCount} ativo${activeCount !== 1 ? 's' : ''})`}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs hover:bg-gray-500/20"
              onClick={clearCompleted}
              title="Limpar concluídos"
            >
              Limpar
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-gray-500/20"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimizar" : "Expandir"}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-red-500/20"
            onClick={toggleVisibility}
            title="Fechar"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Upload List */}
      {isExpanded && (
        <div className="max-h-80 overflow-y-auto">
          {uploads.length === 0 ? (
            <div className="p-6 text-center text-white/60 text-sm">
              Nenhum upload ativo
            </div>
          ) : (
            uploads.map(upload => (
              <UploadItemComponent key={upload.id} upload={upload} />
            ))
          )}
        </div>
      )}

      {/* Summary (when minimized) */}
      {!isExpanded && (
        <div className="p-3 text-xs text-white/70">
          {activeCount > 0 && `${activeCount} ativo${activeCount !== 1 ? 's' : ''}`}
          {completedCount > 0 && (activeCount > 0 ? `, ${completedCount} concluído${completedCount !== 1 ? 's' : ''}` : `${completedCount} concluído${completedCount !== 1 ? 's' : ''}`)}
          {failedCount > 0 && `, ${failedCount} falhou${failedCount !== 1 ? 'ram' : ''}`}
        </div>
      )}
    </div>
  )
}