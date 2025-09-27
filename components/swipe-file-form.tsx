"use client"

import { useState, useEffect } from "react"
import { X, Save, Link, FileText, Hash, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase/client"

interface SwipeFile {
  id: string
  name: string
  niche: string
  ads_count: number
  link: string
  is_active: boolean
  created_at: string
  updated_at: string
  user_id?: string
}

interface SwipeFileFormProps {
  file?: SwipeFile | null
  onSave: (data: Partial<SwipeFile>) => Promise<void>
  onClose: () => void
}

export default function SwipeFileForm({ file, onSave, onClose }: SwipeFileFormProps) {
  const [loading, setLoading] = useState(false)
  const [niches, setNiches] = useState<string[]>([])
  
  // Recuperar último nicho usado do localStorage
  const getLastNiche = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSwipeFileNiche') || "Outros"
    }
    return "Outros"
  }
  
  const [formData, setFormData] = useState({
    name: "",
    niche: getLastNiche(), // Usar último nicho
    ads_count: 0,
    link: ""
  })

  useEffect(() => {
    loadNiches()
    if (file) {

      setFormData({
        name: file.name,
        niche: file.niche || "Outros",
        ads_count: file.ads_count,
        link: file.link
      })
    }
  }, [file])

  const loadNiches = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("swipe_niches")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) throw error

      const nicheNames = data?.map(n => n.name) || []
      
      // Se não houver nichos, usar lista padrão
      if (nicheNames.length === 0) {
        setNiches([
          "Disfunção Erétil (ED)",
          "Emagrecimento",
          "Finanças",
          "Beleza",
          "Saúde",
          "Fitness",
          "Relacionamento",
          "Educação",
          "Tecnologia",
          "Marketing",
          "Outros"
        ])
      } else {
        setNiches(nicheNames)
      }
    } catch (error) {

      // Usar lista padrão em caso de erro
      setNiches([
        "Disfunção Erétil (ED)",
        "Emagrecimento",
        "Finanças",
        "Beleza",
        "Saúde",
        "Fitness",
        "Relacionamento",
        "Educação",
        "Tecnologia",
        "Marketing",
        "Outros"
      ])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (!formData.name.trim()) {
      toast.error("Nome da biblioteca é obrigatório")
      return
    }
    
    if (!formData.link.trim()) {
      toast.error("Link é obrigatório")
      return
    }
    
    if (!formData.link.startsWith("http://") && !formData.link.startsWith("https://")) {
      toast.error("Link deve começar com http:// ou https://")
      return
    }
    
    if (formData.ads_count < 0) {
      toast.error("Quantidade de anúncios não pode ser negativa")
      return
    }

    setLoading(true)
    try {
      // Salvar o nicho selecionado no localStorage para uso futuro
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastSwipeFileNiche', formData.niche)
      }
      
      // Se estiver editando, não enviar ads_count para prevenir alteração
      const dataToSave = file 
        ? { name: formData.name, niche: formData.niche, link: formData.link }
        : formData
      
      await onSave(dataToSave)
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            {file ? "Editar Biblioteca" : "Nova Biblioteca"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Nome da Biblioteca
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          {/* Nicho */}
          <div className="space-y-2">
            <Label htmlFor="niche" className="text-white flex items-center gap-2">
              <Palette className="h-4 w-4 text-gray-400" />
              Nicho
            </Label>
            <Select
              value={formData.niche}
              onValueChange={(value) => setFormData({ ...formData, niche: value })}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {niches.map((niche) => (
                  <SelectItem key={niche} value={niche}>
                    {niche}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade de Anúncios */}
          <div className="space-y-2">
            <Label htmlFor="ads_count" className="text-white flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-400" />
              Quantidade de Anúncios 
              {file && (
                <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                  atualizado automaticamente pelo rastreamento
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="ads_count"
                type="number"
                min="0"
                value={formData.ads_count}
                onChange={(e) => !file && setFormData({ ...formData, ads_count: parseInt(e.target.value) || 0 })}
                className={`bg-gray-800 border-gray-700 ${file ? 'bg-gray-900/50 text-gray-500 cursor-not-allowed' : 'text-white'}`}
                disabled={!!file}
                readOnly={!!file}
                required={!file}
              />
              {file && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-xs text-gray-600">🔒</span>
                </div>
              )}
            </div>
            {!file && formData.ads_count > 0 && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="text-green-500">✓</span>
                Este valor será registrado como Dia 1 do rastreamento
              </p>
            )}
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link" className="text-white flex items-center gap-2">
              <Link className="h-4 w-4 text-gray-400" />
              Link da Biblioteca
            </Label>
            <Input
              id="link"
              type="url"
              placeholder="https://exemplo.com/biblioteca"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {file ? "Atualizar" : "Criar"}
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}