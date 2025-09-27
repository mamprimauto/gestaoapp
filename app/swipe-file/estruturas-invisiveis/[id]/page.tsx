"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Save, Eye, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import InlineCommentEditor from "@/components/editor/InlineCommentEditor"


interface EstruturaData {
  titulo: string
  conteudo: string // HTML content
  conteudo_text: string // Plain text for search/display
  tipo: 'VSL' | 'Criativo' | 'Lead'
}

export default function EstruturaPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string }
  searchParams: { mode?: string }
}) {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(searchParams.mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [formData, setFormData] = useState<EstruturaData>({
    titulo: "",
    conteudo: "",
    conteudo_text: "",
    tipo: "VSL"
  })

  useEffect(() => {
    fetchEstrutura()
  }, [params.id])

  const fetchEstrutura = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch(`/api/estruturas-invisiveis/${params.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        setFormData({
          titulo: data.titulo,
          conteudo: data.conteudo || '',
          conteudo_text: data.conteudo_text || '',
          tipo: data.tipo || 'VSL'
        })
      } else {
        throw new Error("Erro ao buscar estrutura")
      }
    } catch (error) {
      console.error("Error fetching estrutura:", error)
      toast.error("Erro ao carregar estrutura")
      router.push("/swipe-file/estruturas-invisiveis")
    } finally {
      setLoading(false)
    }
  }


  // Handle Tiptap editor changes
  const handleEditorChange = (htmlContent: string) => {
    // Convert HTML to plain text for search/display
    const textContent = htmlContent.replace(/<[^>]*>/g, '').trim()

    setFormData(prev => ({
      ...prev,
      conteudo: htmlContent,
      conteudo_text: textContent
    }))
  }


  const handleSave = async () => {
    if (!formData.titulo.trim() || !formData.conteudo_text.trim()) {
      toast.error("Título e conteúdo são obrigatórios")
      return
    }

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      // Prepare data for API
      const saveData = {
        titulo: formData.titulo,
        conteudo: formData.conteudo, // Store HTML content
        conteudo_text: formData.conteudo_text // Store plain text for search
      }

      const response = await fetch(`/api/estruturas-invisiveis/${params.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(saveData)
      })

      if (response.ok) {
        toast.success("Estrutura atualizada com sucesso")
        setIsEditMode(false)
      } else {
        throw new Error("Erro ao atualizar estrutura")
      }
    } catch (error) {
      console.error("Error saving estrutura:", error)
      toast.error("Erro ao salvar estrutura")
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1b23] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-64"></div>
            <div className="h-12 bg-gray-700 rounded"></div>
            <div className="h-96 bg-gray-700 rounded"></div>
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
              onClick={() => router.push('/swipe-file/estruturas-invisiveis')}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-white">
              {isEditMode ? "Editando Estrutura" : "Visualizando Estrutura"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditMode(!isEditMode)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {isEditMode ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditMode ? "Visualizar" : "Editar"}
            </Button>
            {isEditMode && (
              <Button
                onClick={handleSave}
                disabled={saving || !formData.titulo.trim() || !formData.conteudo_text.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Título */}
          <div>
            <Label htmlFor="titulo" className="text-white text-lg mb-2 block">
              Título
            </Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ex: Anúncio Emagrecimento - Estrutura VSL"
              className="bg-gray-800 border-gray-700 text-white text-lg h-12"
              disabled={!isEditMode}
            />
          </div>

          {/* Conteúdo */}
          <div>
            <Label className="text-white text-lg mb-2 block">
              Conteúdo
            </Label>
            
            <InlineCommentEditor
              value={formData.conteudo}
              onChange={handleEditorChange}
              placeholder="Cole aqui o texto da estrutura invisível..."
              readOnly={!isEditMode}
              estruturaId={params.id}
            />
          </div>

        </div>
      </div>

    </div>
  )
}