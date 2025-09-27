"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createProduct, type ProductNomenclature } from "@/lib/products-db"
import { Palette } from "lucide-react"

// Emojis populares para produtos (sem duplicatas)
const EMOJI_OPTIONS = [
  "📱", "💻", "🎯", "🚀", "💡", "🎨", "📊", "🛠️",
  "🎮", "📚", "🎬", "🎵", "🏆", "⚡", "🔥", "✨",
  "💎", "🌟", "🧠", "💖", "📹", "🎭", "🎪", "🎸"
]

// Gradientes pré-definidos
const GRADIENT_OPTIONS = [
  { name: "Azul", value: "from-blue-500 to-blue-600", color: "#007AFF" },
  { name: "Vermelho", value: "from-red-500 to-red-600", color: "#FF453A" },
  { name: "Rosa", value: "from-pink-500 to-pink-600", color: "#FF2D92" },
  { name: "Verde", value: "from-green-500 to-green-600", color: "#34C759" },
  { name: "Roxo", value: "from-purple-500 to-purple-600", color: "#AF52DE" },
  { name: "Laranja", value: "from-orange-500 to-orange-600", color: "#FF9500" },
  { name: "Índigo", value: "from-indigo-500 to-indigo-600", color: "#5856D6" },
  { name: "Ciano", value: "from-cyan-500 to-cyan-600", color: "#32ADE6" },
]

interface ProductModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ProductModal({ open, onClose, onSuccess }: ProductModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Formulário do produto
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "📦",
    color: "#007AFF",
    bgGradient: "from-blue-500 to-blue-600",
  })
  
  // Configuração de nomenclatura
  const [nomenclature, setNomenclature] = useState<ProductNomenclature>({
    prefixo_oferta: "",
    numeracao_inicial: 1,
    iniciais_copy_padrao: "AUTO",
    iniciais_editor_padrao: "AUTO",
    fonte_trafego_padrao: "FB"
  })
  
  async function handleSubmit() {
    // Validação
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o produto",
        variant: "destructive"
      })
      return
    }
    
    if (!nomenclature.prefixo_oferta.trim()) {
      toast({
        title: "Prefixo obrigatório",
        description: "Por favor, insira um prefixo para a nomenclatura",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    
    try {
      const result = await createProduct({
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        bgGradient: formData.bgGradient,
        nomenclature: nomenclature
      })
      
      if (result) {
        toast({
          title: "Produto criado!",
          description: `${formData.name} foi adicionado com sucesso`
        })
        
        // Reset form
        setFormData({
          name: "",
          description: "",
          icon: "📦",
          color: "#007AFF",
          bgGradient: "from-blue-500 to-blue-600",
        })
        
        setNomenclature({
          prefixo_oferta: "",
          numeracao_inicial: 1,
          iniciais_copy_padrao: "AUTO",
          iniciais_editor_padrao: "AUTO",
          fonte_trafego_padrao: "FB"
        })
        
        onSuccess?.()
        onClose()
      } else {
        throw new Error("Falha ao criar produto")
      }
    } catch (error) {
      toast({
        title: "Erro ao criar produto",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
        <DialogHeader>
          <DialogTitle>Criar Novo Produto</DialogTitle>
          <DialogDescription className="text-white/60">
            Configure as informações e nomenclatura do seu produto
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Coluna esquerda - Informações básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80">Informações Básicas</h3>
            
            <div>
              <Label htmlFor="name">Nome do Produto</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: TaskMaster Pro"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o produto..."
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white resize-none h-20"
              />
            </div>
            
            <div>
              <Label>Ícone</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                    className={`h-10 w-10 rounded-lg border text-xl flex items-center justify-center transition-colors ${
                      formData.icon === emoji 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'border-[#3A3A3C] hover:border-[#4A4A4A] hover:bg-[#2A2A2C]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Cor e Gradiente</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {GRADIENT_OPTIONS.map(gradient => (
                  <button
                    key={gradient.value}
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      bgGradient: gradient.value,
                      color: gradient.color
                    }))}
                    className={`h-12 rounded-lg border-2 transition-all ${
                      formData.bgGradient === gradient.value 
                        ? 'border-white shadow-lg scale-105' 
                        : 'border-transparent hover:border-white/50'
                    }`}
                  >
                    <div className={`h-full w-full rounded-md bg-gradient-to-br ${gradient.value}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Coluna direita - Nomenclatura */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80">Configuração de Nomenclatura</h3>
            
            <div>
              <Label htmlFor="prefixo">Prefixo da Oferta *</Label>
              <Input
                id="prefixo"
                value={nomenclature.prefixo_oferta}
                onChange={(e) => setNomenclature(prev => ({ 
                  ...prev, 
                  prefixo_oferta: e.target.value.toUpperCase().slice(0, 4) 
                }))}
                placeholder="Ex: MM, AG, YT"
                maxLength={4}
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="numeracao">Numeração Inicial</Label>
              <Input
                id="numeracao"
                type="number"
                min="1"
                value={nomenclature.numeracao_inicial}
                onChange={(e) => setNomenclature(prev => ({ 
                  ...prev, 
                  numeracao_inicial: parseInt(e.target.value) || 1 
                }))}
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="copy">Iniciais Copy Padrão</Label>
              <Input
                id="copy"
                value={nomenclature.iniciais_copy_padrao}
                onChange={(e) => setNomenclature(prev => ({ 
                  ...prev, 
                  iniciais_copy_padrao: e.target.value.toUpperCase() 
                }))}
                placeholder="AUTO ou iniciais (Ex: JO)"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editor">Iniciais Editor Padrão</Label>
              <Input
                id="editor"
                value={nomenclature.iniciais_editor_padrao}
                onChange={(e) => setNomenclature(prev => ({ 
                  ...prev, 
                  iniciais_editor_padrao: e.target.value.toUpperCase() 
                }))}
                placeholder="AUTO ou iniciais (Ex: MA)"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="fonte-trafego">Fonte de Tráfego Padrão</Label>
              <Input
                id="fonte-trafego"
                value={nomenclature.fonte_trafego_padrao}
                onChange={(e) => setNomenclature(prev => ({ 
                  ...prev, 
                  fonte_trafego_padrao: e.target.value.toUpperCase().slice(0, 3) 
                }))}
                placeholder="Ex: FB, IG, TT"
                maxLength={3}
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            {/* Preview */}
            <div className="mt-4 p-3 bg-[#2A2A2C] rounded-lg border border-[#3A3A3C]">
              <div className="text-xs text-white/60 mb-1">Exemplo de nomenclatura:</div>
              <div className="text-sm font-mono text-white">
                #1-{nomenclature.prefixo_oferta || "XX"}-9x16-REE-0-PT-CB0-H1-B1-R0-{
                  nomenclature.iniciais_copy_padrao === "AUTO" ? "COPY" : nomenclature.iniciais_copy_padrao
                }-{
                  nomenclature.iniciais_editor_padrao === "AUTO" ? "EDITOR" : nomenclature.iniciais_editor_padrao
                }-{nomenclature.fonte_trafego_padrao || "FB"}
              </div>
            </div>
          </div>
        </div>
        
        {/* Rodapé com botões */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1 bg-[#007AFF] hover:bg-[#007AFF]/90"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Criando...
              </div>
            ) : (
              'Criar Produto'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}