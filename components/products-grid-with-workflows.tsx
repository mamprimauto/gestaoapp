"use client"

import { useMemo, useState, useEffect } from "react"
import { useTaskData } from "./task-data"
import { PRODUCTS, getProductStats, WorkflowType } from "@/lib/products-db"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Calendar, Settings, Video, Palette, UserPlus, Play, CheckCircle2, Sparkles, ArrowRight, Images } from "lucide-react"

interface ProductsGridWithWorkflowsProps {
  onProductSelect: (productId: string, workflowType: WorkflowType) => void
  onCreateTask: (productId: string, workflowType: WorkflowType) => void
  onConfigureNomenclature: (productId: string) => void
}

export default function ProductsGridWithWorkflows({
  onProductSelect,
  onCreateTask,
  onConfigureNomenclature
}: ProductsGridWithWorkflowsProps) {
  const { tasks, loading, members } = useTaskData()
  const [productsWithStats, setProductsWithStats] = useState<any[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const loadProductStats = async () => {
      setStatsLoading(true)
      try {
        const productsWithStatsData = await Promise.all(
          PRODUCTS.map(async (product) => ({
            ...product,
            stats: {
              criativos: await getProductStats(tasks, product.id, "criativos", members),
              leads: await getProductStats(tasks, product.id, "leads", members),
              vsl: await getProductStats(tasks, product.id, "vsl", members),
              materiais: await getProductStats(tasks, product.id, "materiais", members)
            }
          }))
        )
        setProductsWithStats(productsWithStatsData)
      } catch (error) {
        console.error('Error loading product stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    if (!loading) {
      loadProductStats()
    }
  }, [tasks, members, loading])

  if (loading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto animate-pulse">
          <div className="h-8 w-64 bg-[#3A3A3C] rounded mx-auto mb-3" />
          <div className="h-4 w-96 bg-[#3A3A3C] rounded mx-auto" />
        </div>
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
      </div>
    )
  }

  const allTasksCount = productsWithStats.reduce((acc, product) =>
    acc + product.stats.criativos.totalTasks + product.stats.leads.totalTasks + product.stats.vsl.totalTasks + product.stats.materiais.totalTasks, 0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Gestão de Produtos</h2>
        </div>
        <p className="text-lg text-white/70 leading-relaxed">
          Escolha um produto e o tipo de workflow para gerenciar seus materiais de marketing
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productsWithStats.map((product) => (
          <ProductCardWithWorkflows
            key={product.id}
            product={product}
            onSelect={onProductSelect}
            onCreateTask={onCreateTask}
            onConfigureNomenclature={() => onConfigureNomenclature(product.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {allTasksCount === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum material ainda</h3>
          <p className="text-white/70">Clique nos botões dos produtos acima para começar a criar seus materiais</p>
        </div>
      )}
    </div>
  )
}

interface ProductCardWithWorkflowsProps {
  product: any
  onSelect: (productId: string, workflowType: WorkflowType) => void
  onCreateTask: (productId: string, workflowType: WorkflowType) => void
  onConfigureNomenclature: () => void
}

function ProductCardWithWorkflows({ 
  product, 
  onSelect, 
  onCreateTask,
  onConfigureNomenclature 
}: ProductCardWithWorkflowsProps) {
  const { stats } = product
  
  const totalTasks = stats.criativos.totalTasks + stats.leads.totalTasks + stats.vsl.totalTasks + stats.materiais.totalTasks
  const totalCompleted = stats.criativos.completedTasks + stats.leads.completedTasks + stats.vsl.completedTasks + stats.materiais.completedTasks
  const overallCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  // Check if all work is completed
  const isAllCompleted = totalTasks > 0 && overallCompletionRate === 100
  const hasPendingWork = (stats.criativos.pendingClelio > 0 || stats.criativos.pendingDanilo > 0 ||
    stats.leads.pendingClelio > 0 || stats.leads.pendingDanilo > 0 ||
    stats.vsl.pendingClelio > 0 || stats.vsl.pendingDanilo > 0 ||
    stats.materiais.pendingClelio > 0 || stats.materiais.pendingDanilo > 0)

  return (
    <div className="group rounded-3xl border border-[#3A3A3C] bg-gradient-to-br from-[#2C2C2E] to-[#1F1F23] p-6 hover:border-[#4A4A4A] hover:shadow-2xl hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
      
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <div className={cn("w-full h-full rounded-full bg-gradient-to-br", product.bgGradient)} />
      </div>
      
      {/* Header com ícone e ações */}
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div 
            className={cn(
              "h-20 w-20 rounded-3xl flex items-center justify-center text-3xl bg-gradient-to-br shadow-lg",
              product.bgGradient
            )}
          >
            {product.icon}
          </div>
          
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0 border-[#4A4A4A] hover:bg-[#4A4A4A] hover:border-[#6A6A6A] rounded-xl transition-all duration-200"
            onClick={onConfigureNomenclature}
            title="Configurar nomenclatura"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Informações do produto */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-2xl font-bold text-white">{product.name}</h3>
          {product.nomenclature?.prefixo_oferta && (
            <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
              {product.nomenclature.prefixo_oferta}
            </Badge>
          )}
        </div>
        <p className="text-white/70 line-clamp-2 leading-relaxed">{product.description}</p>
      </div>

      {/* Progress Bar Geral */}
      {totalTasks > 0 && (
        <div className="mb-6 relative z-10">
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span className="font-medium">Progresso Geral</span>
            <span className="font-bold">{overallCompletionRate}%</span>
          </div>
          <div className="h-3 bg-[#1F1F1F] rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm"
              style={{ width: `${overallCompletionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats por tipo de workflow - agora clicáveis */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center relative z-10">
        <button
          onClick={() => onSelect(product.id, "criativos")}
          className="group/btn bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-3 hover:from-blue-500/20 hover:to-blue-600/10 hover:border-blue-400/50 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Palette className="h-4 w-4 text-blue-400 group-hover/btn:scale-110 transition-transform duration-200" />
            <div className="text-blue-400 text-lg font-bold">{stats.criativos.totalTasks}</div>
          </div>
          <div className="text-white/70 text-xs font-medium">Criativos</div>
        </button>
        <button
          onClick={() => onSelect(product.id, "leads")}
          className="group/btn bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-3 hover:from-green-500/20 hover:to-green-600/10 hover:border-green-400/50 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <UserPlus className="h-4 w-4 text-green-400 group-hover/btn:scale-110 transition-transform duration-200" />
            <div className="text-green-400 text-lg font-bold">{stats.leads.totalTasks}</div>
          </div>
          <div className="text-white/70 text-xs font-medium">Leads</div>
        </button>
        <button
          onClick={() => onSelect(product.id, "vsl")}
          className="group/btn bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-3 hover:from-purple-500/20 hover:to-purple-600/10 hover:border-purple-400/50 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Play className="h-4 w-4 text-purple-400 group-hover/btn:scale-110 transition-transform duration-200" />
            <div className="text-purple-400 text-lg font-bold">{stats.vsl.totalTasks}</div>
          </div>
          <div className="text-white/70 text-xs font-medium">VSLs</div>
        </button>
        <button
          onClick={() => onSelect(product.id, "materiais")}
          className="group/btn bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-3 hover:from-orange-500/20 hover:to-orange-600/10 hover:border-orange-400/50 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Images className="h-4 w-4 text-orange-400 group-hover/btn:scale-110 transition-transform duration-200" />
            <div className="text-orange-400 text-lg font-bold">{stats.materiais.totalTasks}</div>
          </div>
          <div className="text-white/70 text-xs font-medium">Materiais</div>
        </button>
      </div>

      {/* Contadores específicos por usuário ou mensagem de conclusão */}
      {isAllCompleted ? (
        <div className="mb-6 h-20 flex items-center justify-center py-4 px-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl relative z-10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
            <div className="flex flex-col">
              <div className="text-green-400 font-semibold text-sm">Todo trabalho concluído!</div>
              <div className="text-white/60 text-xs">Parabéns! Todos os materiais foram finalizados.</div>
            </div>
          </div>
        </div>
      ) : hasPendingWork && (
        <div className="mb-6 h-20 flex items-center justify-center py-4 px-4 bg-gradient-to-r from-orange-500/5 to-cyan-500/5 border border-orange-500/20 rounded-xl relative z-10">
          <div className="grid grid-cols-2 gap-6 text-center w-full">
            <div className="flex flex-col items-center justify-center">
              <div className="text-orange-400 text-xl font-bold mb-1">
                {stats.criativos.pendingClelio + stats.leads.pendingClelio + stats.vsl.pendingClelio + stats.materiais.pendingClelio}
              </div>
              <div className="text-white/70 text-sm font-medium">Pendentes Clélio</div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-cyan-400 text-xl font-bold mb-1">
                {stats.criativos.pendingDanilo + stats.leads.pendingDanilo + stats.vsl.pendingDanilo + stats.materiais.pendingDanilo}
              </div>
              <div className="text-white/70 text-sm font-medium">Pendentes Danilo</div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}