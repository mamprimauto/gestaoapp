"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Settings, Plus, X, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

interface Tag {
  name: string
  color: string
}

interface InboxTaskCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (taskData: { title: string; priority?: string; tags: Tag[]; content: string; columnId: string }) => void
  columnId: string
}

const PREDEFINED_TYPES = [
  { name: "Lembrete", color: "#FF6B6B" },
  { name: "Aviso", color: "#FFD93D" },
  { name: "Anotação", color: "#6BCF7F" },
  { name: "Ideia", color: "#4ECDC4" },
  { name: "Importante", color: "#FF8B94" },
  { name: "Revisão", color: "#A8E6CF" },
]

const AVAILABLE_COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCF7F", "#4ECDC4", 
  "#FF8B94", "#A8E6CF", "#FFB3BA", "#95E1D3",
  "#F38BA8", "#A8DADC", "#457B9D", "#1D3557",
  "#F72585", "#B5179E", "#7209B7", "#480CA8",
]


export function InboxTaskCreationModal({ isOpen, onClose, onComplete, columnId }: InboxTaskCreationModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedType, setSelectedType] = useState<Tag | null>(null)
  const [customTags, setCustomTags] = useState<Tag[]>([])
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#FF6B6B")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const handleNext = () => {
    if (step === 1 && selectedType) {
      setStep(2)
    } else if (step === 2 && title.trim()) {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleComplete = () => {
    const allTags = selectedType ? [selectedType] : []
    onComplete({
      title: title.trim(),
      priority: undefined,
      tags: allTags,
      content: content.trim(),
      columnId
    })
    
    // Reset state
    setStep(1)
    setSelectedType(null)
    setCustomTags([])
    setTitle("")
    setContent("")
    setShowTagManager(false)
    setNewTagName("")
    setNewTagColor("#FF6B6B")
    onClose()
  }

  const handleCancel = () => {
    // Reset state
    setStep(1)
    setSelectedType(null)
    setCustomTags([])
    setTitle("")
    setContent("")
    setShowTagManager(false)
    setNewTagName("")
    setNewTagColor("#FF6B6B")
    onClose()
  }

  const addCustomTag = () => {
    if (newTagName.trim()) {
      const newTag = { name: newTagName.trim(), color: newTagColor }
      setCustomTags([...customTags, newTag])
      setNewTagName("")
      setNewTagColor("#FF6B6B")
    }
  }

  const removeCustomTag = (index: number) => {
    setCustomTags(customTags.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-lg bg-[#1A1A1C] border-[#2A2A2C] text-white z-[9999]">
        {/* Step 1: Escolher Tipo */}
        {step === 1 && (
          <div className="space-y-6 p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Novo Lembrete</h2>
              <p className="text-white/60 text-sm">
                Escolha o tipo do seu item
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {PREDEFINED_TYPES.map((type) => (
                <button
                  key={type.name}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all hover:scale-105",
                    selectedType?.name === type.name
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-[#3A3A3C] hover:border-[#4A4A4C] bg-[#2A2A2C]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm font-medium">{type.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="hover:bg-[#2A2A2C] text-white/60"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedType}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Título e Conteúdo */}
        {step === 2 && (
          <div className="space-y-6 p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Finalizar Item</h2>
              <p className="text-white/60 text-sm">
                Adicione título e descrição
              </p>
            </div>

            {/* Preview da tag selecionada */}
            <div className="bg-[#2A2A2C] rounded-lg p-3">
              <div className="text-xs text-white/60 mb-2">Tipo selecionado:</div>
              <Badge
                style={{ backgroundColor: selectedType?.color + '20', borderColor: selectedType?.color + '40', color: selectedType?.color }}
                className="border text-xs"
              >
                {selectedType?.name}
              </Badge>
            </div>
            
            <div className="space-y-4">
              <Input
                placeholder="Título do item..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40"
                autoFocus
              />
              
              <Textarea
                placeholder="Descrição ou conteúdo (opcional)..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white placeholder:text-white/40 min-h-[100px]"
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="hover:bg-[#2A2A2C] text-white/60"
              >
                Voltar
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!title.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Criar Item
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}