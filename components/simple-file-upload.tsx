"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import FileDownloadSelector from "./file-download-selector"
import { 
  Folder
} from "lucide-react"

interface SimpleFileUploadProps {
  taskId: string
  size?: "sm" | "md" | "lg"
}

export function SimpleFileUpload({ taskId, size = "md" }: SimpleFileUploadProps) {
  const [fileCount, setFileCount] = useState(0)
  const [showFiles, setShowFiles] = useState(false)

  // Função simples para buscar contagem de arquivos diretamente do Supabase
  const fetchFileCount = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from("task_files")
        .select("id")
        .eq("task_id", taskId)
        .eq("file_category", "entregavel")
      
      if (!error && data) {
        setFileCount(data.length)
      }
    } catch (error) {

    }
  }

  // Buscar contagem ao montar e a cada 10 segundos
  useEffect(() => {
    fetchFileCount()
    const interval = setInterval(fetchFileCount, 10000)
    return () => clearInterval(interval)
  }, [taskId])

  // Callback para quando arquivos forem adicionados/removidos
  const handleFilesChanged = () => {
    // Atualizar contagem após mudanças
    setTimeout(fetchFileCount, 500)
  }

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  return (
    <>
      {/* Botão único de Pasta - sempre visível */}
      <button
        onClick={(e) => {
          e.stopPropagation() // Impedir propagação para o item pai
          setShowFiles(true)
        }}
        className={`
          ${sizeClasses[size]}
          relative rounded-lg border-2 
          ${
            fileCount > 0
              ? "border-green-500 bg-green-500/10 hover:bg-green-500/20"
              : "border-[#3A3A3C] bg-[#2C2C2E] hover:border-[#4A4A4C] hover:bg-[#3A3A3C]"
          }
          transition-all duration-200
          flex items-center justify-center
          flex-shrink-0
        `}
        title={fileCount > 0 ? `Ver ${fileCount} arquivo(s)` : "Gerenciar arquivos"}
      >
        <Folder className={`${iconSizes[size]} ${fileCount > 0 ? "text-green-500" : "text-white/60"} flex-shrink-0`} />
        
        {/* Badge com número de arquivos */}
        {fileCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
            {fileCount > 99 ? "99+" : fileCount}
          </span>
        )}
      </button>

      {/* Modal de arquivos com upload integrado */}
      {showFiles && (
        <div 
          onClick={(e) => e.stopPropagation()} // Prevenir propagação do clique
          onMouseDown={(e) => e.stopPropagation()} // Prevenir propagação do mousedown
        >
          <FileDownloadSelector
            taskId={taskId}
            open={showFiles}
            onOpenChange={(open) => {
              setShowFiles(open)
              if (!open) {
                // Atualizar contagem ao fechar
                handleFilesChanged()
              }
            }}
            fileCategory="entregavel"
            onFileDeleted={handleFilesChanged}
            onFileUploaded={handleFilesChanged}
            showUploadButton={true}
          />
        </div>
      )}
    </>
  )
}