"use client"

import type React from "react"
import { useRef, useState, useCallback } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Upload, Loader2, Check, AlertCircle, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUploadQueue } from "./upload-queue-context"

type UploadState = "idle" | "hover" | "uploading" | "success" | "error"

interface InlineFileUploadProps {
  taskId: string
  onUploadSuccess?: () => void
  className?: string
  size?: "sm" | "md" | "lg"
  fileCategory?: string // Categoria do arquivo: 'avatar', 'inspiration', 'general'
}

// Limites de tamanho por categoria
const MAX_SIZES = {
  avatar: 100 * 1024 * 1024,      // 100MB
  inspiration: 900 * 1024 * 1024,  // 900MB
  entregavel: 2 * 1024 * 1024 * 1024, // 2GB
  general: 1024 * 1024 * 1024,     // 1GB (padrão)
}

function toErrorMessage(e: any): string {
  if (!e) return "Erro desconhecido"
  if (typeof e === "string") return e
  if (typeof e.message === "string") return e.message
  if (typeof e.error === "string") return e.error
  if (typeof e.error?.message === "string") return e.error.message
  try {
    return JSON.stringify(e, Object.getOwnPropertyNames(e))
  } catch {
    return "Erro inesperado"
  }
}

export default function InlineFileUpload({ 
  taskId, 
  onUploadSuccess,
  className,
  size = "md",
  fileCategory = "general"
}: InlineFileUploadProps) {
  const { toast } = useToast()
  const { addUpload } = useUploadQueue()
  const [state, setState] = useState<UploadState>("idle")
  const [uploadProgress, setUploadProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  // Upload com progresso real usando XMLHttpRequest
  async function uploadWithRealProgress(
    signedUrl: string, 
    file: File, 
    contentType: string,
    onProgress: (progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      
      // Timeout de 10 minutos para uploads grandes
      xhr.timeout = 10 * 60 * 1000
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100)
          resolve({ success: true })
        } else {
          resolve({ success: false, error: `HTTP ${xhr.status}: ${xhr.statusText}` })
        }
      }
      
      xhr.onerror = () => {
        resolve({ success: false, error: "Erro de rede durante upload" })
      }
      
      xhr.ontimeout = () => {
        resolve({ success: false, error: "Timeout: Upload demorou mais que 10 minutos" })
      }
      
      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
      xhr.send(file)
    })
  }

  async function signUpload(path: string, token: string, file: File, contentType?: string) {
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.storage
      .from("task-files")
      .uploadToSignedUrl(path, token, file, { contentType: contentType || "application/octet-stream" } as any)
    return { data, error }
  }

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    // Para múltiplos arquivos quando é entregavel
    const filesToUpload = fileCategory === 'entregavel' ? Array.from(files) : [files[0]]
    
    try {
      // Verifica o limite de tamanho para cada arquivo
      const maxSize = MAX_SIZES[fileCategory as keyof typeof MAX_SIZES] || MAX_SIZES.general
      const maxSizeText = fileCategory === 'avatar' ? '100MB' :
                         fileCategory === 'inspiration' ? '900MB' :
                         fileCategory === 'entregavel' ? '2GB' : '1GB'
      
      for (const file of filesToUpload) {
        if (file.size > maxSize) {
          throw new Error(`Arquivo "${file.name}" muito grande. Máximo ${maxSizeText} permitido.`)
        }
      }

      // Adiciona todos os arquivos à fila de upload
      for (const file of filesToUpload) {
        addUpload(file, taskId, fileCategory)
      }
      
      // Feedback visual temporário
      setState("success")
      
      toast({
        title: filesToUpload.length === 1 ? "Upload adicionado" : "Uploads adicionados",
        description: filesToUpload.length === 1 
          ? `${filesToUpload[0].name} foi adicionado à fila de upload.`
          : `${filesToUpload.length} arquivos foram adicionados à fila de upload.`,
      })

      onUploadSuccess?.()

      // Reset para idle após 2s
      setTimeout(() => {
        setState("idle")
        setUploadProgress(0)
      }, 2000)

    } catch (error: any) {
      setState("error")
      
      toast({
        title: "Erro",
        description: toErrorMessage(error),
        variant: "destructive",
      })
      
      // Reset para idle após 3s
      setTimeout(() => {
        setState("idle")
      }, 3000)
    }
  }, [taskId, toast, onUploadSuccess, fileCategory, addUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (state === "idle") {
      setState("hover")
    }

    // Clear any existing timeout
    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current)
    }
  }, [state])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Set timeout to change state back to idle
    // This prevents flickering when dragging over child elements
    dropTimeoutRef.current = setTimeout(() => {
      if (state === "hover") {
        setState("idle")
      }
    }, 100)
  }, [state])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (dropTimeoutRef.current) {
      clearTimeout(dropTimeoutRef.current)
    }
    
    setState("idle")
    handleUpload(e.dataTransfer.files)
  }, [handleUpload])

  const handleClick = useCallback(() => {
    if (state === "uploading") return
    inputRef.current?.click()
  }, [state])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files)
  }, [handleUpload])

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer group",
        sizeClasses[size],
        state === "idle" && "border-[#3A3A3C] bg-[#1C1C1E] hover:border-[#4A4A4A] hover:bg-[#2A2A2A]",
        state === "hover" && "border-[#FFD60A] bg-[#FFD60A]/5",
        state === "uploading" && "border-[#007AFF] bg-[#007AFF]/5",
        state === "success" && "border-[#30D158] bg-[#30D158]/10",
        state === "error" && "border-[#FF453A] bg-[#FF453A]/5",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        multiple={fileCategory === 'entregavel'} // Permite múltiplos arquivos para entregavel
        onChange={handleFileChange}
      />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {state === "idle" && (
          <>
            <ImageIcon className={cn("text-white/40 group-hover:text-white/60 transition-colors", iconSizes[size])} />
            {size !== "sm" && (
              <div className="text-[10px] text-white/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Upload
              </div>
            )}
          </>
        )}
        
        {state === "hover" && (
          <>
            <Upload className={cn("text-[#FFD60A] animate-pulse", iconSizes[size])} />
            {size !== "sm" && (
              <div className="text-[10px] text-[#FFD60A] mt-1">
                Solte aqui
              </div>
            )}
          </>
        )}
        
        {state === "uploading" && (
          <>
            <Loader2 className={cn("text-[#007AFF] animate-spin", iconSizes[size])} />
            {size !== "sm" && (
              <div className="text-[10px] text-[#007AFF] mt-1">
                {uploadProgress}%
              </div>
            )}
          </>
        )}
        
        {state === "success" && (
          <>
            <Check className={cn("text-[#30D158]", iconSizes[size])} />
            {size !== "sm" && (
              <div className="text-[10px] text-[#30D158] mt-1">
                Enviado
              </div>
            )}
          </>
        )}
        
        {state === "error" && (
          <>
            <AlertCircle className={cn("text-[#FF453A]", iconSizes[size])} />
            {size !== "sm" && (
              <div className="text-[10px] text-[#FF453A] mt-1">
                Erro
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress bar para estado de upload */}
      {state === "uploading" && (
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-black/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#007AFF] transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Componente simplificado para fallback button
export function InlineFileUploadButton({ 
  taskId, 
  onUploadSuccess,
  variant = "outline",
  size = "sm",
  fileCategory = "general"
}: InlineFileUploadProps & { 
  variant?: "outline" | "ghost"
  size?: "sm" | "md"
}) {
  const { toast } = useToast()
  const { addUpload } = useUploadQueue()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    // Para múltiplos arquivos quando é entregavel
    const filesToUpload = fileCategory === 'entregavel' ? Array.from(files) : [files[0]]
    
    try {
      // Verifica o limite de tamanho para cada arquivo
      const maxSize = MAX_SIZES[fileCategory as keyof typeof MAX_SIZES] || MAX_SIZES.general
      const maxSizeText = fileCategory === 'avatar' ? '100MB' :
                         fileCategory === 'inspiration' ? '900MB' :
                         fileCategory === 'entregavel' ? '2GB' : '1GB'
      
      for (const file of filesToUpload) {
        if (file.size > maxSize) {
          throw new Error(`Arquivo "${file.name}" muito grande. Máximo ${maxSizeText} permitido.`)
        }
      }

      // Adiciona todos os arquivos à fila de upload
      for (const file of filesToUpload) {
        addUpload(file, taskId, fileCategory)
      }
      
      toast({
        title: filesToUpload.length === 1 ? "Upload adicionado" : "Uploads adicionados",
        description: filesToUpload.length === 1 
          ? `${filesToUpload[0].name} foi adicionado à fila de upload.`
          : `${filesToUpload.length} arquivos foram adicionados à fila de upload.`,
      })

      onUploadSuccess?.()

    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: toErrorMessage(error),
        variant: "destructive",
      })
    }
  }, [taskId, toast, onUploadSuccess, fileCategory, addUpload])

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        multiple={fileCategory === 'entregavel'} // Permite múltiplos arquivos para entregavel
        onChange={(e) => handleUpload(e.target.files)}
      />
      <Button
        variant={variant}
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="h-8 w-8 p-0"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}