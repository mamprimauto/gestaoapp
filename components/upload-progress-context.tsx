"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface UploadProgressState {
  isUploading: boolean
  progress: number
  fileName: string
  fileCategory: string
}

interface UploadProgressContextType {
  uploadState: UploadProgressState
  startUpload: (fileName: string, fileCategory: string) => void
  updateProgress: (progress: number) => void
  completeUpload: () => void
  cancelUpload: () => void
}

const UploadProgressContext = createContext<UploadProgressContextType | undefined>(undefined)

export function UploadProgressProvider({ children }: { children: ReactNode }) {
  const [uploadState, setUploadState] = useState<UploadProgressState>({
    isUploading: false,
    progress: 0,
    fileName: '',
    fileCategory: ''
  })

  const startUpload = (fileName: string, fileCategory: string) => {
    setUploadState({
      isUploading: true,
      progress: 0,
      fileName,
      fileCategory
    })
  }

  const updateProgress = (progress: number) => {
    setUploadState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress))
    }))
  }

  const completeUpload = () => {
    setUploadState(prev => ({
      ...prev,
      progress: 100
    }))
    
    // Aguarda um pouco para mostrar 100% antes de fechar
    setTimeout(() => {
      setUploadState({
        isUploading: false,
        progress: 0,
        fileName: '',
        fileCategory: ''
      })
    }, 1000)
  }

  const cancelUpload = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      fileName: '',
      fileCategory: ''
    })
  }

  return (
    <UploadProgressContext.Provider 
      value={{ 
        uploadState, 
        startUpload, 
        updateProgress, 
        completeUpload, 
        cancelUpload 
      }}
    >
      {children}
    </UploadProgressContext.Provider>
  )
}

export function useUploadProgress() {
  const context = useContext(UploadProgressContext)
  if (context === undefined) {
    throw new Error('useUploadProgress must be used within an UploadProgressProvider')
  }
  return context
}