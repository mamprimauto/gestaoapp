"use client"

import { useState } from "react"
import { useTaskData } from "@/components/task-data"
import ProductCreatives from "@/components/product-creatives"
import ProductsGridWithWorkflows from "@/components/products-grid-with-workflows"
import { getProductById, PRODUCTS, refreshProducts, WorkflowType } from "@/lib/products-db"
import { getNextCreativeNumber, generateCreativeNomenclature, getNextGlobalHookNumber, getNextGlobalBodyNumber, getNextGlobalClickbaitNumber, generateLeadNomenclature, generateVslNomenclature } from "@/lib/products-db"
import { updateProductNomenclature, type ProductNomenclature } from "@/lib/products-db"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function MateriaisPage() {
  const { addTask, tasks, members } = useTaskData()
  const { toast } = useToast()
  
  // Iniciar com null para mostrar a tela de seleção primeiro
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<WorkflowType | null>(null)
  
  // Estado para abrir automaticamente o modal após criar
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null)
  
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

  async function handleCreateTask(productId: string, workflowType: WorkflowType = "criativos") {
    // Para materiais, apenas definir o produto selecionado sem criar task
    if (workflowType === "materiais") {
      setSelectedProduct(productId)
      setSelectedWorkflowType(workflowType)
      return
    }

    // Refresh products to get latest data from database
    await refreshProducts()
    const product = await getProductById(productId)

    // Criar data para o dia seguinte no fuso horário do Brasil
    const now = new Date()
    // Obter a data atual no Brasil
    const brazilNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}))
    // Criar data para amanhã
    const tomorrow = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), brazilNow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().split('T')[0]
    
    // Se o produto tem nomenclatura configurada, criar com dados pré-populados
    if (product?.nomenclature) {
      const nextNumber = getNextCreativeNumber(tasks, productId, workflowType)
      
      // Obter números globais únicos para o novo item
      const globalHookNumber = getNextGlobalHookNumber(tasks, productId, workflowType)
      const globalBodyNumber = getNextGlobalBodyNumber(tasks, productId, workflowType)
      const globalClickbaitNumber = getNextGlobalClickbaitNumber(tasks, productId)
      
      // Encontrar automaticamente Copy e Editor baseado nos cargos
      let defaultCopyInitials = ""
      let defaultEditorInitials = ""
      let defaultAssigneeId: string | undefined = undefined
      
      // Procurar por um copywriter na equipe
      const copywriter = members.find(m => m.role?.toLowerCase() === "copywriter")
      if (copywriter && copywriter.name) {
        defaultCopyInitials = copywriter.name.trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase())
          .slice(0, 2)
          .join('')
      }
      
      // Procurar por um editor na equipe
      const editor = members.find(m => m.role?.toLowerCase() === "editor")
      if (editor) {
        if (editor.name) {
          defaultEditorInitials = editor.name.trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('')
        }
        defaultAssigneeId = editor.id
      }
      
      // Se não encontrou, usar valores padrão da nomenclatura
      if (!defaultCopyInitials && product.nomenclature.iniciais_copy_padrao !== "AUTO") {
        defaultCopyInitials = product.nomenclature.iniciais_copy_padrao
      }
      if (!defaultEditorInitials && product.nomenclature.iniciais_editor_padrao !== "AUTO") {
        defaultEditorInitials = product.nomenclature.iniciais_editor_padrao
      }
      
      // Gerar dados e título baseado no tipo de workflow
      let initialData: any
      let initialTitle: string
      
      if (workflowType === "criativos") {
        initialData = {
          hooks: [""],
          bodies: [""],
          checklist: [
            { text: "", completed: false }
          ],
          numero_criativo: nextNumber,
          prefixo_oferta: product.nomenclature.prefixo_oferta,
          numero_clickbait: globalClickbaitNumber,
          numero_hook: globalHookNumber,
          numero_body: globalBodyNumber,
          numero_edicao: 0,
          iniciais_copy: defaultCopyInitials,
          iniciais_editor: defaultEditorInitials,
          fonte_trafego: product.nomenclature.fonte_trafego_padrao,
          status_desempenho: "NAO USADO",
        }
        
        initialTitle = generateCreativeNomenclature(
          productId, 
          nextNumber, 
          globalClickbaitNumber, 
          globalHookNumber, 
          globalBodyNumber, 
          0,
          defaultCopyInitials,
          defaultEditorInitials,
          product.nomenclature.fonte_trafego_padrao
        )
      } else if (workflowType === "leads") {
        initialData = {
          estrategias: [""],
          checklist: [
            { text: "", completed: false }
          ],
          numero_lead: nextNumber,
          prefixo_oferta: product.nomenclature.prefixo_oferta,
          iniciais_copy: defaultCopyInitials,
          iniciais_editor: defaultEditorInitials,
          fonte_trafego: product.nomenclature.fonte_trafego_padrao,
          idioma: "EN-US",
          avatar: "",
          formato: "",
          status_desempenho: "NAO USADO",
        }
        
        initialTitle = generateLeadNomenclature(
          productId,
          nextNumber,
          defaultCopyInitials,
          defaultEditorInitials,
          product.nomenclature.fonte_trafego_padrao,
          "EN-US",
          "",
          "",
          ""
        )
      } else { // vsl
        initialData = {
          roteiro: [""],
          checklist: [
            { text: "", completed: false }
          ],
          numero_vsl: nextNumber,
          prefixo_oferta: product.nomenclature.prefixo_oferta,
          duracao_estimada: "",
          iniciais_copy: defaultCopyInitials,
          iniciais_editor: defaultEditorInitials,
          fonte_trafego: product.nomenclature.fonte_trafego_padrao,
          idioma: "EN-US",
          avatar: "",
          formato: "",
          status_desempenho: "NAO USADO",
        }
        
        initialTitle = generateVslNomenclature(
          productId,
          nextNumber,
          defaultCopyInitials,
          defaultEditorInitials,
          product.nomenclature.fonte_trafego_padrao,
          "EN-US",
          "",
          "",
          "",
          undefined // duracao será preenchida depois
        )
      }

      const created = await addTask({
        tag: workflowType,
        owner: productId,
        title: initialTitle,
        description: JSON.stringify(initialData),
        due_date: tomorrowISO,
        assignee_id: defaultAssigneeId
      })
      
      if (created?.id) {
        setSelectedProduct(productId)
        setAutoOpenTaskId(created.id)
      }
    } else {
      // Fallback para produtos sem nomenclatura configurada
      const fallbackTitles = {
        criativos: "Novo Criativo",
        leads: "Nova Estratégia de Lead", 
        vsl: "Novo VSL"
      }
      
      const created = await addTask({
        tag: workflowType,
        owner: productId,
        title: fallbackTitles[workflowType],
        description: `Descreva o ${workflowType} aqui...`,
        due_date: tomorrowISO
      })
      
      if (created?.id) {
        setSelectedProduct(productId)
        setAutoOpenTaskId(created.id)
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {selectedProduct ? (
        <ProductCreatives
          productId={selectedProduct}
          workflowType={selectedWorkflowType!}
          onBack={() => {
            setSelectedProduct(null)
            setSelectedWorkflowType(null)
            setAutoOpenTaskId(null)
          }}
          onCreateTask={() => handleCreateTask(selectedProduct, selectedWorkflowType!)}
          autoOpenTaskId={autoOpenTaskId}
          onAutoOpenComplete={() => setAutoOpenTaskId(null)}
          onWorkflowTypeChange={(workflowType) => {
            setSelectedWorkflowType(workflowType)
            setAutoOpenTaskId(null)
          }}
        />
      ) : (
        <ProductsGridWithWorkflows
          onProductSelect={(productId: string, workflowType: WorkflowType) => {
            setSelectedProduct(productId)
            setSelectedWorkflowType(workflowType)
          }}
          onCreateTask={(productId: string, workflowType: WorkflowType) => handleCreateTask(productId, workflowType)}
          onConfigureNomenclature={openConfigModal}
        />
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