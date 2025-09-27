"use client"

import { useState } from 'react'
import { MoreVertical, Edit2, Trash2, Play, Pause, BarChart3 } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { SimpleABTest } from '@/lib/simple-ab-tests'

interface TestActionsDropdownProps {
  test: SimpleABTest
  onEdit: (test: SimpleABTest) => void
  onView: (test: SimpleABTest) => void
  onRefresh: () => void
}

export default function TestActionsDropdown({ 
  test, 
  onEdit, 
  onView, 
  onRefresh 
}: TestActionsDropdownProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/ab-tests/${test.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir teste')
      }

      toast({
        title: "Teste excluído",
        description: `O teste ${test.test_id} foi removido com sucesso.`,
      })

      onRefresh()
      setShowDeleteDialog(false)
    } catch (error) {

      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = async () => {
    toast({
      title: "Em breve",
      description: "Funcionalidade de pausar/reativar teste será implementada em breve.",
    })
  }

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onView(test)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(test)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div 
      onClick={handleDropdownClick}
      onMouseDown={handleDropdownClick}
      className="relative z-40"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-zinc-800/80 rounded-md transition-all duration-200 flex items-center justify-center border border-transparent hover:border-zinc-600"
            type="button"
            style={{ zIndex: 50 }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="end" 
          className="w-48 bg-zinc-900 border-zinc-800"
          sideOffset={8}
          style={{ zIndex: 999 }}
        >
          <DropdownMenuItem 
            onClick={handleViewClick}
            className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Ver detalhes
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={handleEditClick}
            className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation()
              handleToggleStatus()
            }}
            className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            {test.status === 'running' ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Reativar
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-zinc-800" />
          
          <DropdownMenuItem 
            onClick={handleDeleteClick}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirmar exclusão
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem certeza que deseja excluir o teste <strong className="text-white">{test.test_id}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita. Todos os dados, métricas e comentários associados a este teste serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="bg-zinc-800 text-gray-300 border-zinc-700 hover:bg-zinc-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}