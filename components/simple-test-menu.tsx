"use client"

import { useState } from 'react'
import { MoreVertical, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { getSupabaseClient } from '@/lib/supabase/client'
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

interface SimpleTestMenuProps {
  test: SimpleABTest
  onRefresh: () => void
  onTestDeleted?: (testId: string) => void
}

export default function SimpleTestMenu({ test, onRefresh, onTestDeleted }: SimpleTestMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleMenuClick = (e: React.MouseEvent) => {

    e.preventDefault()
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleDelete = async () => {

    try {
      setIsDeleting(true)

      // Get Supabase client and session token

      const supabase = await getSupabaseClient()

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {

        throw new Error('Erro ao obter sessão de autenticação')
      }
      
      if (!session?.access_token) {

        throw new Error('Você precisa fazer login para excluir testes. Redirecionando...')
      }

      const response = await fetch(`/api/ab-tests/${test.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()

        throw new Error(error.error || 'Erro ao excluir teste')
      }

      toast({
        title: "Teste excluído",
        description: `O teste ${test.test_id} foi removido com sucesso.`,
      })

      // First: Notify parent that test was deleted (to close modals, etc.)
      if (onTestDeleted) {

        onTestDeleted(test.id)
      }

      setShowDeleteDialog(false)
      setShowMenu(false)

      // Small delay to allow modals to close before refreshing
      setTimeout(() => {

        onRefresh()
      }, 100)

    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : "Erro inesperado"
      
      // If it's an auth error, suggest login
      const isAuthError = errorMessage.includes('login') || errorMessage.includes('logado') || errorMessage.includes('Unauthorized')

      toast({
        title: isAuthError ? "Login necessário" : "Erro ao excluir",
        description: isAuthError 
          ? "Você precisa estar logado para excluir testes. Faça login primeiro." 
          : errorMessage,
        variant: "destructive",
      })
      
      // If auth error, could redirect to login
      if (isAuthError && errorMessage.includes('Redirecionando')) {

        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      }
    } finally {

      setIsDeleting(false)
    }
  }

  return (
    <>
      <div 
        className="relative"
        onClick={(e) => {
          // Sempre parar propagação para prevenir abertura do modal
          e.stopPropagation()
          e.preventDefault()
        }}
        onMouseDown={(e) => {
          // Também prevenir no mouse down
          e.stopPropagation()
        }}
      >
        <button
          onClick={handleMenuClick}
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all duration-200 flex items-center justify-center"
          style={{ 
            position: 'relative',
            zIndex: 100,
            backgroundColor: showMenu ? '#27272a' : 'transparent'
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        
        {showMenu && (
          <div 
            className="absolute top-full right-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg py-1"
            style={{ zIndex: 101 }}
          >
            <button
              onClick={(e) => {

                e.stopPropagation()
                setShowDeleteDialog(true)
                setShowMenu(false)
              }}
              className="w-full px-3 py-2 text-left text-red-400 hover:text-red-300 hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          </div>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => {

        setShowDeleteDialog(open)
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirmar exclusão
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem certeza que deseja excluir o teste <strong className="text-white">{test.test_id}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita.
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
              onClick={(e) => {

                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay para fechar menu quando clicar fora */}
      {showMenu && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 99 }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  )
}