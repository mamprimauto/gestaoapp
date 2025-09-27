"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, Settings, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Niche {
  id: string
  name: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SwipeNichesModalProps {
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

const colors = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { value: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
  { value: 'cyan', label: 'Ciano', class: 'bg-cyan-500' },
  { value: 'emerald', label: 'Esmeralda', class: 'bg-emerald-500' },
  { value: 'gray', label: 'Cinza', class: 'bg-gray-500' },
]

export default function SwipeNichesModal({ open, onClose, onUpdate }: SwipeNichesModalProps) {
  const [niches, setNiches] = useState<Niche[]>([])
  const [loading, setLoading] = useState(false)
  const [newNiche, setNewNiche] = useState({ name: '', color: 'gray' })
  const [addingNiche, setAddingNiche] = useState(false)

  useEffect(() => {
    if (open) {
      loadNiches()
    }
  }, [open])

  const loadNiches = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("swipe_niches")
        .select("*")
        .order("name", { ascending: true })

      if (error) throw error

      setNiches(data || [])
    } catch (error) {

      toast.error("Erro ao carregar nichos")
    }
  }

  const handleAddNiche = async () => {
    if (!newNiche.name.trim()) {
      toast.error("Nome do nicho é obrigatório")
      return
    }

    setAddingNiche(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from("swipe_niches")
        .insert({
          name: newNiche.name.trim(),
          color: newNiche.color,
          is_active: true
        })

      if (error) {
        if (error.code === '23505') {
          toast.error("Este nicho já existe")
        } else {
          throw error
        }
        return
      }

      toast.success("Nicho adicionado com sucesso!")
      setNewNiche({ name: '', color: 'gray' })
      await loadNiches()
      onUpdate()
    } catch (error) {

      toast.error("Erro ao adicionar nicho")
    } finally {
      setAddingNiche(false)
    }
  }

  const handleToggleNiche = async (niche: Niche) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from("swipe_niches")
        .update({ is_active: !niche.is_active })
        .eq("id", niche.id)

      if (error) throw error

      await loadNiches()
      onUpdate()
    } catch (error) {

      toast.error("Erro ao atualizar nicho")
    }
  }

  const handleDeleteNiche = async (niche: Niche) => {
    if (!confirm(`Deseja remover o nicho "${niche.name}"?`)) return

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from("swipe_niches")
        .delete()
        .eq("id", niche.id)

      if (error) throw error

      toast.success("Nicho removido com sucesso!")
      await loadNiches()
      onUpdate()
    } catch (error) {

      toast.error("Erro ao remover nicho")
    }
  }

  const getColorClass = (color: string) => {
    const colorObj = colors.find(c => c.value === color)
    return colorObj?.class || 'bg-gray-500'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            Gerenciar Nichos
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Adicione, remova ou desative nichos para suas bibliotecas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo nicho */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Adicionar Novo Nicho</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Nome do nicho"
                value={newNiche.name}
                onChange={(e) => setNewNiche({ ...newNiche, name: e.target.value })}
                className="flex-1 bg-gray-800 border-gray-700 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleAddNiche()}
              />
              <Select
                value={newNiche.color}
                onValueChange={(value) => setNewNiche({ ...newNiche, color: value })}
              >
                <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorClass(newNiche.color)}`} />
                    <span>{colors.find(c => c.value === newNiche.color)?.label || 'Cinza'}</span>
                  </div>
                </SelectTrigger>
                <SelectContent 
                  className="bg-gray-800 border-gray-700" 
                  position="popper"
                  sideOffset={5}
                  align="start"
                  style={{ zIndex: 9999 }}
                >
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value} className="text-white hover:bg-gray-700">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color.class}`} />
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddNiche}
                disabled={addingNiche || !newNiche.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addingNiche ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Lista de nichos */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {niches.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Nenhum nicho cadastrado
              </div>
            ) : (
              niches.map((niche) => (
                <div
                  key={niche.id}
                  className={`bg-gray-800/30 rounded-lg p-3 border ${
                    niche.is_active ? 'border-gray-700' : 'border-gray-800 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getColorClass(niche.color)}`} />
                      <span className={`font-medium ${
                        niche.is_active ? 'text-white' : 'text-gray-500'
                      }`}>
                        {niche.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={niche.is_active}
                        onCheckedChange={() => handleToggleNiche(niche)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteNiche(niche)}
                        className="h-8 w-8 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t border-gray-800">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}