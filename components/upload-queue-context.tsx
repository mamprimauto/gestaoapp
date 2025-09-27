"use client"
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useToast } from '@/hooks/use-toast'
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'paused' | 'cancelled'
export interface UploadItem {
  id: string
  file: File
  fileName: string
  fileSize: number
  fileCategory: string
  taskId: string
  progress: number
  status: UploadStatus
  error?: string
  startTime?: number
  completedTime?: number
  speed?: number // bytes per second
  eta?: number // estimated time remaining in seconds
  abortController?: AbortController
}
interface UploadQueueContextType {
  uploads: UploadItem[]
  activeUploads: number
  totalUploads: number
  isVisible: boolean
  // Actions
  addUpload: (file: File, taskId: string, fileCategory: string) => string
  removeUpload: (id: string) => void
  pauseUpload: (id: string) => void
  resumeUpload: (id: string) => void
  cancelUpload: (id: string) => void
  retryUpload: (id: string) => void
  clearCompleted: () => void
  toggleVisibility: () => void
  // Internal updates
  updateUploadProgress: (id: string, progress: number) => void
  updateUploadStatus: (id: string, status: UploadStatus, error?: string) => void
  updateUploadSpeed: (id: string, speed: number, eta: number) => void
  // Callback registration for upload completion
  onUploadComplete: (callback: (taskId: string, fileCategory: string) => void) => () => void
}
const UploadQueueContext = createContext<UploadQueueContextType | undefined>(undefined)
const MAX_CONCURRENT_UPLOADS = 3
const STORAGE_KEY = 'upload-queue'
export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [completionCallbacks, setCompletionCallbacks] = useState<Map<string, (taskId: string, fileCategory: string) => void>>(new Map())
  // Load uploads from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const savedUploads = JSON.parse(saved) as UploadItem[]
        // Only restore non-completed uploads, reset uploading to pending
        const restoredUploads = savedUploads
          .filter(upload => upload.status !== 'completed')
          .map(upload => ({
            ...upload,
            status: upload.status === 'uploading' ? 'pending' as UploadStatus : upload.status,
            progress: upload.status === 'uploading' ? 0 : upload.progress,
            abortController: undefined // Don't restore abort controllers
          }))
        setUploads(restoredUploads)
      } catch (error) {
      }
    }
  }, [])
  // Save uploads to localStorage whenever uploads change
  useEffect(() => {
    const uploadsToSave = uploads.map(upload => ({
      ...upload,
      abortController: undefined // Don't save abort controllers
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadsToSave))
  }, [uploads])
  // Auto-start pending uploads when there's capacity
  useEffect(() => {
    const activeCount = uploads.filter(u => u.status === 'uploading').length
    const pendingUploads = uploads.filter(u => u.status === 'pending')
    if (activeCount < MAX_CONCURRENT_UPLOADS && pendingUploads.length > 0) {
      const toStart = pendingUploads.slice(0, MAX_CONCURRENT_UPLOADS - activeCount)
      toStart.forEach(upload => {
        startUpload(upload.id)
      })
    }
  }, [uploads])
  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending').length
  const totalUploads = uploads.length
  const addUpload = useCallback((file: File, taskId: string, fileCategory: string): string => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newUpload: UploadItem = {
      id,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileCategory,
      taskId,
      progress: 0,
      status: 'pending',
      startTime: Date.now(),
    }
    setUploads(prev => [...prev, newUpload])
    setIsVisible(true) // Show panel when upload is added
    return id
  }, [])
  const removeUpload = useCallback((id: string) => {
    setUploads(prev => {
      const upload = prev.find(u => u.id === id)
      if (upload?.abortController) {
        upload.abortController.abort()
      }
      return prev.filter(u => u.id !== id)
    })
  }, [])
  const pauseUpload = useCallback((id: string) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id && upload.status === 'uploading') {
        upload.abortController?.abort()
        return { ...upload, status: 'paused', abortController: undefined }
      }
      return upload
    }))
  }, [])
  const resumeUpload = useCallback((id: string) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id && upload.status === 'paused') {
        return { ...upload, status: 'pending' }
      }
      return upload
    }))
  }, [])
  const cancelUpload = useCallback((id: string) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id) {
        upload.abortController?.abort()
        return { ...upload, status: 'cancelled', abortController: undefined }
      }
      return upload
    }))
  }, [])
  const retryUpload = useCallback((id: string) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id && (upload.status === 'failed' || upload.status === 'cancelled')) {
        return { ...upload, status: 'pending', progress: 0, error: undefined }
      }
      return upload
    }))
  }, [])
  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'completed' && u.status !== 'cancelled'))
  }, [])
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev)
  }, [])
  const updateUploadProgress = useCallback((id: string, progress: number) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id) {
        return { ...upload, progress }
      }
      return upload
    }))
  }, [])
  const updateUploadStatus = useCallback((id: string, status: UploadStatus, error?: string) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id) {
        const updates: Partial<UploadItem> = { 
          status, 
          error,
          completedTime: status === 'completed' ? Date.now() : upload.completedTime
        }
        return { ...upload, ...updates }
      }
      return upload
    }))
    // Show toast for completed uploads and call completion callbacks
    if (status === 'completed') {
      const upload = uploads.find(u => u.id === id)
      if (upload) {
        toast({
          title: "Upload concluído",
          description: `${upload.fileName} foi enviado com sucesso.`,
        })
        // Call all registered completion callbacks
        completionCallbacks.forEach(callback => {
          try {
            callback(upload.taskId, upload.fileCategory)
          } catch (error) {
          }
        })
      }
    }
  }, [uploads, toast, completionCallbacks])
  const updateUploadSpeed = useCallback((id: string, speed: number, eta: number) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id) {
        return { ...upload, speed, eta }
      }
      return upload
    }))
  }, [])
  const onUploadComplete = useCallback((callback: (taskId: string, fileCategory: string) => void) => {
    const callbackId = Math.random().toString(36).slice(2)
    setCompletionCallbacks(prev => new Map(prev).set(callbackId, callback))
    // Return cleanup function
    return () => {
      setCompletionCallbacks(prev => {
        const newMap = new Map(prev)
        newMap.delete(callbackId)
        return newMap
      })
    }
  }, [])
  // Internal function to start an upload
  const startUpload = async (id: string) => {
    const upload = uploads.find(u => u.id === id)
    if (!upload || upload.status !== 'pending') return
    const abortController = new AbortController()
    setUploads(prev => prev.map(u => u.id === id ? {
      ...u, 
      status: 'uploading', 
      startTime: Date.now(),
      abortController
    } : u))
    try {
      await performUpload(upload, abortController)
    } catch (error: any) {
      if (!abortController.signal.aborted) {
        updateUploadStatus(id, 'failed', error.message)
      }
    }
  }
  // Function to perform the actual upload
  const performUpload = async (upload: UploadItem, abortController: AbortController) => {
    try {
      // Get Supabase client and session
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess.session?.access_token
      if (!jwt) throw new Error("Sessão expirada")
      updateUploadProgress(upload.id, 5)
      // 1) Request signed upload URL
      const signRes = await fetch(`/api/tasks/${upload.taskId}/files/sign-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ 
          fileName: upload.fileName, 
          size: upload.fileSize, 
          contentType: upload.file.type 
        }),
      })
      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData?.error || "Erro ao preparar upload")
      updateUploadProgress(upload.id, 10)
      if (!signData.signedUrl) {
        throw new Error("URL assinada não retornada pelo servidor")
      }
      // 2) Perform actual upload with real progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.timeout = 10 * 60 * 1000 // 10 minutes
        xhr.upload.onprogress = (event) => {
          if (abortController.signal.aborted) {
            xhr.abort()
            return
          }
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            const realProgress = 10 + Math.round(progress * 0.8) // 10-90%
            updateUploadProgress(upload.id, realProgress)
            // Calculate speed and ETA
            const currentTime = Date.now()
            const elapsedTime = (currentTime - (upload.startTime || currentTime)) / 1000 // seconds
            if (elapsedTime > 0) {
              const speed = event.loaded / elapsedTime // bytes per second
              const remainingBytes = event.total - event.loaded
              const eta = remainingBytes / speed // seconds
              updateUploadSpeed(upload.id, speed, eta)
            }
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
          }
        }
        xhr.onerror = () => reject(new Error("Erro de rede durante upload"))
        xhr.ontimeout = () => reject(new Error("Timeout: Upload demorou mais que 10 minutos"))
        xhr.onabort = () => reject(new Error("Upload cancelado"))
        xhr.open('PUT', signData.signedUrl)
        xhr.setRequestHeader('Content-Type', upload.file.type || 'application/octet-stream')
        xhr.send(upload.file)
      })
      updateUploadProgress(upload.id, 95)
      // 3) Confirm and register metadata
      const confirmRes = await fetch(`/api/tasks/files/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          taskId: upload.taskId,
          path: signData.path,
          fileName: upload.fileName,
          size: upload.fileSize,
          contentType: upload.file.type,
          fileCategory: upload.fileCategory,
        }),
      })
      if (!confirmRes.ok) {
        const errorData = await confirmRes.json()
        throw new Error(errorData?.error || "Erro ao confirmar upload")
      }
      updateUploadProgress(upload.id, 100)
      updateUploadStatus(upload.id, 'completed')
    } catch (error: any) {
      if (!abortController.signal.aborted) {
        updateUploadStatus(upload.id, 'failed', error.message)
      }
      throw error
    }
  }
  return (
    <UploadQueueContext.Provider value={{
      uploads,
      activeUploads,
      totalUploads,
      isVisible,
      addUpload,
      removeUpload,
      pauseUpload,
      resumeUpload,
      cancelUpload,
      retryUpload,
      clearCompleted,
      toggleVisibility,
      updateUploadProgress,
      updateUploadStatus,
      updateUploadSpeed,
      onUploadComplete,
    }}>
      {children}
    </UploadQueueContext.Provider>
  )
}
export function useUploadQueue() {
  const context = useContext(UploadQueueContext)
  if (context === undefined) {
    throw new Error('useUploadQueue must be used within an UploadQueueProvider')
  }
  return context
}