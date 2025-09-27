"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, ArrowLeft, Layers, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"

interface EstruturaInvisivel {
  id: string
  titulo: string
  conteudo: string
  anotacoes: any[]
  created_at: string
  created_by?: string
  tipo?: 'VSL' | 'Criativo' | 'Lead'
  user_profile?: {
    full_name?: string
    email?: string
  }
}

export default function EstruturasInvisiveisPage() {
  const router = useRouter()
  const [estruturas, setEstruturas] = useState<EstruturaInvisivel[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showTipoModal, setShowTipoModal] = useState(false)

  useEffect(() => {
    fetchEstruturas()
  }, [])

  const fetchEstruturas = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch("/api/estruturas-invisiveis", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEstruturas(data.estruturas || [])
      } else {
        throw new Error("Erro ao buscar estruturas")
      }
    } catch (error) {
      console.error("Error fetching estruturas:", error)
      toast.error("Erro ao carregar estruturas")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/estruturas-invisiveis/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        setEstruturas(prev => prev.filter(e => e.id !== id))
        toast.success("Estrutura deletada com sucesso")
      } else {
        throw new Error("Erro ao deletar estrutura")
      }
    } catch (error) {
      console.error("Error deleting estrutura:", error)
      toast.error("Erro ao deletar estrutura")
    }
    setDeleteId(null)
  }

  const getPreview = (conteudo: string) => {
    return conteudo.length > 150 ? conteudo.substring(0, 150) + "..." : conteudo
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getCommentCount = (estruturaId: string) => {
    try {
      const stored = localStorage.getItem(`inline_comments_${estruturaId}`)
      if (stored) {
        const comments = JSON.parse(stored)
        return Array.isArray(comments) ? comments.length : 0
      }
    } catch (error) {
      console.error("Error loading comments for estrutura:", estruturaId, error)
    }
    return 0
  }

  const handleTipoSelection = (tipo: 'VSL' | 'Criativo' | 'Lead') => {
    setShowTipoModal(false)
    router.push(`/swipe-file/estruturas-invisiveis/nova?tipo=${tipo}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b23] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-40 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1b23] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/swipe-file')}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Layers className="h-8 w-8 text-purple-500" />
                Estruturas Invisíveis
              </h1>
              <p className="text-gray-400 mt-1">
                Analise e anote estruturas de anúncios
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowTipoModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Estrutura
          </Button>
        </div>

        {/* Estruturas Grid */}
        {estruturas.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">
              Nenhuma estrutura criada
            </h3>
            <p className="text-gray-500 mb-6">
              Comece criando sua primeira análise de estrutura invisível
            </p>
            <Button
              onClick={() => setShowTipoModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Estrutura
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {estruturas.map((estrutura) => (
              <Card 
                key={estrutura.id} 
                className="group bg-gray-800/30 border-gray-700 hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
                onClick={() => router.push(`/swipe-file/estruturas-invisiveis/${estrutura.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-white text-lg line-clamp-2">
                          {estrutura.titulo}
                        </CardTitle>
                        {estrutura.tipo && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            estrutura.tipo === 'VSL' 
                              ? 'bg-blue-600/20 text-blue-400' 
                              : estrutura.tipo === 'Criativo'
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-purple-600/20 text-purple-400'
                          }`}>
                            {estrutura.tipo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/swipe-file/estruturas-invisiveis/${estrutura.id}?mode=edit`)
                        }}
                        className="h-8 w-8 p-0 hover:bg-gray-700"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(estrutura.id)
                        }}
                        className="h-8 w-8 p-0 hover:bg-red-600/20 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-purple-400">
                        <MessageCircle className="h-4 w-4" />
                        <span>{getCommentCount(estrutura.id)} comentários</span>
                      </div>
                      <span className="text-gray-500 text-xs">{formatDate(estrutura.created_at)}</span>
                    </div>
                    {(estrutura.user_profile?.full_name || estrutura.user_profile?.email) && (
                      <div className="text-xs text-gray-400">
                        Criado por: {estrutura.user_profile.full_name || estrutura.user_profile.email}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-gray-800 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Confirmar exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Tem certeza que deseja deletar esta estrutura? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Seleção de Tipo */}
        <Dialog open={showTipoModal} onOpenChange={setShowTipoModal}>
          <DialogContent className="sm:max-w-md bg-[#1A1A1C] border-[#2A2A2C] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white text-center">Nova Estrutura Invisível</DialogTitle>
              <DialogDescription className="text-white/60 text-sm text-center">
                Que tipo de estrutura você quer criar?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 p-6">
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleTipoSelection('VSL')}
                  className="w-full h-16 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 text-blue-400 hover:text-blue-300 text-left flex flex-col items-start justify-center"
                >
                  <span className="font-semibold">VSL</span>
                  <span className="text-xs text-blue-400/70">Video Sales Letter</span>
                </Button>
                
                <Button
                  onClick={() => handleTipoSelection('Criativo')}
                  className="w-full h-16 bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 text-green-400 hover:text-green-300 text-left flex flex-col items-start justify-center"
                >
                  <span className="font-semibold">Criativo</span>
                  <span className="text-xs text-green-400/70">Peças criativas e anúncios</span>
                </Button>

                <Button
                  onClick={() => handleTipoSelection('Lead')}
                  className="w-full h-16 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/50 text-purple-400 hover:text-purple-300 text-left flex flex-col items-start justify-center"
                >
                  <span className="font-semibold">Lead</span>
                  <span className="text-xs text-purple-400/70">Estruturas para captura de leads</span>
                </Button>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={() => setShowTipoModal(false)}
                  className="hover:bg-[#2A2A2C] text-white/60"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}