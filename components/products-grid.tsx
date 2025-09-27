"use client"

import { useMemo, useState } from "react"
import { useTaskData } from "./task-data"
import { PRODUCTS, getProductStats, updateProductNomenclature, refreshProducts, type Product, type ProductNomenclature } from "@/lib/products-db"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Plus, Calendar, Settings, Video } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface ProductsGridProps {
  onProductSelect: (productId: string) => void
  onCreateTask: (productId: string) => void
}

interface ProductCardProps {
  product: Product & { stats: any }
  onSelect: () => void
  onCreateTask: () => void
  onConfigureNomenclature: () => void
}

export default function ProductsGrid({ onProductSelect, onCreateTask }: ProductsGridProps) {
  const { tasks, loading, members } = useTaskData()
  const { toast } = useToast()
  
  // Estado para modal de configuração
  const [configModal, setConfigModal] = useState<{ open: boolean; productId: string | null }>({ 
    open: false, 
    productId: null 
  })
  
  const [nomenclatureForm, setNomenclatureForm] = useState<ProductNomenclature>({
    prefixo_oferta: "",
    numeracao_inicial: 1,
    iniciais_copy_padrao: "",
    iniciais_editor_padrao: "",
    fonte_trafego_padrao: ""
  })

  const productsWithStats = useMemo(() => {
    return PRODUCTS.map(product => ({
      ...product,
      stats: getProductStats(tasks, product.id, "criativos", members)
    }))
  }, [tasks, members])

  function openConfigModal(productId: string) {
    const product = PRODUCTS.find(p => p.id === productId)
    if (product?.nomenclature) {
      setNomenclatureForm(product.nomenclature)
    }
    setConfigModal({ open: true, productId })
  }

  function closeConfigModal() {
    setConfigModal({ open: false, productId: null })
  }

  async function saveNomenclature() {
    if (!configModal.productId) return
    
    const success = await updateProductNomenclature(configModal.productId, nomenclatureForm)
    
    if (success) {
      // Refresh products para pegar dados mais recentes
      await refreshProducts()
      
      toast({
        title: "Nomenclatura salva",
        description: "As configurações foram salvas para toda a equipe.",
      })
      closeConfigModal()
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a nomenclatura. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] p-6 animate-pulse">
            <div className="h-16 w-16 bg-[#3A3A3C] rounded-2xl mb-4" />
            <div className="h-6 w-3/4 bg-[#3A3A3C] rounded mb-2" />
            <div className="h-4 w-full bg-[#3A3A3C] rounded mb-4" />
            <div className="h-2 w-full bg-[#3A3A3C] rounded mb-3" />
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-[#3A3A3C] rounded" />
              <div className="h-4 w-16 bg-[#3A3A3C] rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-3">Selecione um Produto</h2>
        <p className="text-white/70">
          Escolha um produto para visualizar e gerenciar seus criativos mais recentes
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productsWithStats.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={() => onProductSelect(product.id)}
            onCreateTask={() => onCreateTask(product.id)}
            onConfigureNomenclature={() => openConfigModal(product.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {productsWithStats.every(p => p.stats.totalTasks === 0) && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum criativo ainda</h3>
          <p className="text-white/70 mb-6">Comece criando seu primeiro criativo para qualquer produto</p>
          <div className="flex flex-wrap justify-center gap-3">
            {PRODUCTS.map(product => (
              <Button
                key={product.id}
                variant="outline"
                onClick={() => onCreateTask(product.id)}
                className="border-[#3A3A3C] hover:bg-[#3A3A3C]"
              >
                <span className="mr-2">{product.icon}</span>
                Criar para {product.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Modal de Configuração */}
      <Dialog open={configModal.open} onOpenChange={(open) => !open && closeConfigModal()}>
        <DialogContent className="max-w-md bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C]">
          <DialogHeader>
            <DialogTitle>Configurar Nomenclatura</DialogTitle>
            <DialogDescription className="text-white/60">
              Configure os padrões de nomenclatura para este produto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="prefixo">Prefixo da Oferta</Label>
              <Input
                id="prefixo"
                value={nomenclatureForm.prefixo_oferta}
                onChange={(e) => setNomenclatureForm(prev => ({ 
                  ...prev, 
                  prefixo_oferta: e.target.value.toUpperCase() 
                }))}
                placeholder="Ex: MM, AG, YT"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="numeracao">Numeração Inicial</Label>
              <Input
                id="numeracao"
                type="number"
                min="1"
                value={nomenclatureForm.numeracao_inicial}
                onChange={(e) => setNomenclatureForm(prev => ({ 
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
                value={nomenclatureForm.iniciais_copy_padrao}
                onChange={(e) => setNomenclatureForm(prev => ({ 
                  ...prev, 
                  iniciais_copy_padrao: e.target.value.toUpperCase() 
                }))}
                placeholder="Ex: JO"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="editor">Iniciais Editor Padrão</Label>
              <Input
                id="editor"
                value={nomenclatureForm.iniciais_editor_padrao}
                onChange={(e) => setNomenclatureForm(prev => ({ 
                  ...prev, 
                  iniciais_editor_padrao: e.target.value.toUpperCase() 
                }))}
                placeholder="Ex: MA"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="fonte-trafego">Fonte de Tráfego Padrão</Label>
              <Input
                id="fonte-trafego"
                value={nomenclatureForm.fonte_trafego_padrao}
                onChange={(e) => setNomenclatureForm(prev => ({ 
                  ...prev, 
                  fonte_trafego_padrao: e.target.value.toUpperCase() 
                }))}
                placeholder="Ex: FB, IG, TT"
                className="bg-[#2A2A2C] border-[#3A3A3C] text-white"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={closeConfigModal} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={saveNomenclature} className="flex-1 bg-[#007AFF] hover:bg-[#007AFF]/90">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductCard({ 
  product, 
  onSelect, 
  onCreateTask,
  onConfigureNomenclature 
}: ProductCardProps) {
  const { stats } = product

  return (
    <div 
      className="group rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E] p-6 hover:border-[#4A4A4A] transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-black/20"
      onClick={onSelect}
    >

      {/* Header com ícone e ações */}
      <div className="flex items-start justify-between mb-4">
        <div 
          className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br",
            product.bgGradient
          )}
        >
          {product.icon}
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-[#4A4A4A] hover:bg-[#4A4A4A]"
            onClick={(e) => {
              e.stopPropagation()
              onConfigureNomenclature()
            }}
            title="Configurar nomenclatura"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-[#4A4A4A] hover:bg-[#4A4A4A]"
            onClick={(e) => {
              e.stopPropagation()
              onCreateTask()
            }}
            title="Criar novo criativo"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white/70 transition-colors" />
        </div>
      </div>

      {/* Informações do produto */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xl font-semibold text-white">{product.name}</h3>
          {product.nomenclature?.prefixo_oferta && (
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 bg-green-500/10">
              {product.nomenclature.prefixo_oferta}
            </Badge>
          )}
        </div>
        <p className="text-sm text-white/70 line-clamp-2">{product.description}</p>
      </div>

      {/* Progress Bar */}
      {stats.totalTasks > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>Progresso</span>
            <span>{stats.completionRate}%</span>
          </div>
          <div className="h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500 bg-gradient-to-r", product.bgGradient)}
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-semibold text-white">{stats.totalTasks}</div>
            <div className="text-white/60 text-xs">Edição</div>
          </div>
          <div>
            <div className="font-semibold text-white">{stats.activeTasks}</div>
            <div className="text-white/60 text-xs">Ativos</div>
          </div>
        </div>

        {stats.lastCreative && (
          <div className="text-right">
            <div className="text-white/60 text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Último
            </div>
            <div className="text-xs text-white/80 font-medium">
              {new Date(stats.lastCreative.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
        )}
      </div>

      {/* Last Creative Preview */}
      {stats.lastCreative && (
        <div className="mt-4 pt-4 border-t border-[#3A3A3C]">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 bg-green-500 rounded-full" />
            <span className="text-xs text-white/60">Último criativo</span>
          </div>
          <div className="text-sm text-white font-medium line-clamp-1">
            {stats.lastCreative.title}
          </div>
        </div>
      )}

      {/* Empty State para produto */}
      {stats.totalTasks === 0 && (
        <div className="mt-4 pt-4 border-t border-[#3A3A3C] text-center">
          <div className="text-white/40 text-sm">
            Nenhum criativo ainda
          </div>
          <Button
            size="sm"
            variant="outline" 
            className="mt-2 border-[#3A3A3C] hover:bg-[#3A3A3C] text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onCreateTask()
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Criar primeiro
          </Button>
        </div>
      )}
    </div>
  )
}