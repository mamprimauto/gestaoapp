"use client"

import { useState } from "react"
import { ArrowLeft, Save, Eye, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import InlineCommentEditor from "@/components/editor/InlineCommentEditor"

interface EstruturaData {
  titulo: string
  conteudo: string // HTML content
  conteudo_text: string // Plain text for search/display
  tipo: 'VSL' | 'Criativo' | 'Lead'
}

export default function NovaEstruturaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isEditMode, setIsEditMode] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Get tipo from URL params
  const tipoFromUrl = searchParams.get('tipo') as 'VSL' | 'Criativo' | 'Lead' | null
  
  const [formData, setFormData] = useState<EstruturaData>({
    titulo: "",
    conteudo: "",
    conteudo_text: "",
    tipo: tipoFromUrl || "VSL"
  })

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
        conteudo_text: formData.conteudo_text, // Store plain text for search
        tipo: formData.tipo
      }

      const response = await fetch("/api/estruturas-invisiveis", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(saveData)
      })

      if (response.ok) {
        toast.success("Estrutura criada com sucesso")
        router.push("/swipe-file/estruturas-invisiveis")
      } else {
        throw new Error("Erro ao criar estrutura")
      }
    } catch (error) {
      console.error("Error saving estrutura:", error)
      toast.error("Erro ao salvar estrutura")
    } finally {
      setSaving(false)
    }
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
              Nova Estrutura Invisível
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
            <Button
              onClick={handleSave}
              disabled={saving || !formData.titulo.trim() || !formData.conteudo_text.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Tipo */}
          <div>
            <Label className="text-white text-lg mb-2 block">
              Tipo de Estrutura
            </Label>
            <Select 
              value={formData.tipo} 
              onValueChange={(value: 'VSL' | 'Criativo' | 'Lead') => setFormData(prev => ({ ...prev, tipo: value }))}
              disabled={!isEditMode}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="VSL" className="text-white hover:bg-gray-700">VSL</SelectItem>
                <SelectItem value="Criativo" className="text-white hover:bg-gray-700">Criativo</SelectItem>
                <SelectItem value="Lead" className="text-white hover:bg-gray-700">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              estruturaId="nova"
            />
          </div>

        </div>
      </div>
    </div>
  )
}