// Sistema de nomenclatura global (compartilhado entre toda equipe)
import { getSupabaseClient } from "@/lib/supabase/client"

export type ProductNomenclature = {
  prefixo_oferta: string
  numeracao_inicial: number
  iniciais_copy_padrao: string
  iniciais_editor_padrao: string
  fonte_trafego_padrao: string
}

export type Product = {
  id: string
  name: string
  description: string
  color: string
  bgGradient: string
  icon: string
  nomenclature?: ProductNomenclature
}

// Produtos fixos (hardcoded)
const nutraMemoria: Product = {
  id: "nutra-memoria",
  name: "Nutra Memória", 
  description: "Nutracêuticos do nicho de Memória",
  color: "#007AFF",
  bgGradient: "from-black to-gray-900",
  icon: "🧠",
  nomenclature: {
    prefixo_oferta: "NM",
    numeracao_inicial: 1,
    iniciais_copy_padrao: "AUTO",
    iniciais_editor_padrao: "AUTO",
    fonte_trafego_padrao: "FB"
  }
}

const nutraEmagrecimento: Product = {
  id: "nutra-emagrecimento",
  name: "Nutra Emagrecimento",
  description: "Nutracêuticos do nicho de Emagrecimento",
  color: "#FF9500",
  bgGradient: "from-black to-gray-900",
  icon: "💪",
  nomenclature: {
    prefixo_oferta: "NE",
    numeracao_inicial: 1,
    iniciais_copy_padrao: "AUTO",
    iniciais_editor_padrao: "AUTO",
    fonte_trafego_padrao: "FB"
  }
}

// Array de produtos (fixo, sem interface de gerenciamento)
export const PRODUCTS: Product[] = [nutraMemoria, nutraEmagrecimento]

// Carregar nomenclaturas do banco de dados
export async function loadNomenclatures(): Promise<void> {
  try {
    const supabase = await getSupabaseClient()
    
    // Buscar todas as nomenclaturas de uma vez
    const { data, error } = await supabase
      .from('product_nomenclatures')
      .select('product_id, nomenclature')
    
    if (!error && data) {
      // Atualizar produtos com nomenclaturas do banco
      data.forEach((item: any) => {
        const product = PRODUCTS.find(p => p.id === item.product_id)
        if (product && item.nomenclature) {
          product.nomenclature = item.nomenclature
        }
      })
    }
  } catch (error) {

  }
}

// Atualizar nomenclatura no banco (GLOBAL - afeta toda equipe)
export async function updateProductNomenclature(productId: string, nomenclature: ProductNomenclature): Promise<boolean> {
  try {
    const supabase = await getSupabaseClient()
    
    // Apenas fazer UPDATE (assume que registros já existem)
    const { error } = await supabase
      .from('product_nomenclatures')
      .update({ nomenclature: nomenclature })
      .eq('product_id', productId)

    if (error) {

      return false
    }

    // Atualizar o produto local
    const product = PRODUCTS.find(p => p.id === productId)
    if (product) {
      product.nomenclature = nomenclature
    }

    return true
  } catch (error) {

    return false
  }
}

// Forçar recarregamento das nomenclaturas
export async function refreshProducts(): Promise<Product[]> {
  await loadNomenclatures()
  return PRODUCTS
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id)
}

export function getProductByIdSync(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id)
}

export type WorkflowType = "criativos" | "leads" | "vsl" | "materiais"

// Listas de formatos por tipo de workflow
export const CREATIVE_FORMATS = [
  "TRICKS_TIPS",
  "HOW_TO", 
  "PROMESSA_RESULTADO",
  "AVISO_URGENTE",
  "HISTORIA_PESSOAL",
  "DESCOBERTA_RECENTE",
  "NOVIDADE",
  "THE_ONE_THING",
  "PROVA_SOCIAL",
  "CONSPIRACIONAL",
  "CURIOSIDADE",
  "QUEBRA_EXPECTATIVA",
  "THE_BIG_MISTAKE",
  "PERGUNTA_PARADOXAL",
  "CONTRA_INTUITIVO",
  "RAPIDO_FACIL",
  "PREVISAO",
  "UGC",
  "FOFOCA"
]

export const LEAD_FORMATS = [
  "QUIZ",
  "EBOOK_GRATUITO",
  "WEBINAR",
  "CURSO_GRATUITO",
  "TEMPLATE",
  "CHECKLIST",
  "GUIA_COMPLETO",
  "AMOSTRA_GRATIS",
  "CONSULTORIA_GRATUITA",
  "AVALIACAO_GRATUITA"
]

export const VSL_FORMATS = [
  "STORYTELLING",
  "DEMONSTRACAO",
  "TESTEMUNHO",
  "TUTORIAL",
  "PROBLEMA_SOLUCAO",
  "COMPARACAO",
  "COUNTDOWN",
  "UNBOXING",
  "BEFORE_AFTER",
  "EXPLICATIVO"
]

// Função para obter formatos por tipo de workflow
export function getFormatsByWorkflow(workflowType: WorkflowType): string[] {
  switch (workflowType) {
    case "criativos":
      return CREATIVE_FORMATS
    case "leads":
      return LEAD_FORMATS
    case "vsl":
      return VSL_FORMATS
    default:
      return CREATIVE_FORMATS
  }
}

export async function getProductStats(tasks: any[], productId: string, workflowType: WorkflowType = "criativos", members: any[] = []) {
  // Para materiais, contar os materiais reais do banco de dados
  if (workflowType === "materiais") {
    try {
      const { getMaterialsByProductId } = await import('@/lib/materials')
      const materials = await getMaterialsByProductId(productId)

      const totalTasks = materials.length
      const completedTasks = materials.length // Todos os materiais são considerados "completos" quando uploadados
      const activeTasks = 0
      const pendingTasks = 0
      const completionRate = totalTasks > 0 ? 100 : 0

      // Último material adicionado
      const lastCreative = materials.length > 0
        ? materials.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null

      return {
        totalTasks,
        completedTasks,
        activeTasks,
        pendingTasks,
        completionRate,
        lastCreative,
        pendingClelio: 0,
        pendingDanilo: 0
      }
    } catch (error) {
      console.error('Error fetching materials for stats:', error)
      // Fallback para stats vazios em caso de erro
      return {
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        pendingTasks: 0,
        completionRate: 0,
        lastCreative: null,
        pendingClelio: 0,
        pendingDanilo: 0
      }
    }
  }

  // Para outros workflow types, usar a lógica original baseada em tasks
  const productTasks = tasks.filter(t =>
    t.tag === workflowType && t.owner === productId
  )

  const totalTasks = productTasks.length
  const completedTasks = productTasks.filter(t => {
    try {
      const parsed = JSON.parse(t.description || '{}')
      return parsed.is_ready === true
    } catch {
      return false
    }
  }).length
  const activeTasks = totalTasks - completedTasks
  const pendingTasks = totalTasks - completedTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Último item adicionado
  const lastCreative = productTasks.length > 0
    ? productTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null

  // Encontrar Clélio e Danilo por nome
  const clelio = members.find(m =>
    m.name?.toLowerCase().includes('clelio') ||
    m.name?.toLowerCase().includes('clélio') ||
    m.email?.toLowerCase().includes('clelio') ||
    m.email?.toLowerCase().includes('clélio')
  )
  const danilo = members.find(m =>
    m.name?.toLowerCase().includes('danilo') ||
    m.email?.toLowerCase().includes('danilo')
  )

  // Contar pendentes específicos (não marcados com check = is_ready !== true)
  const pendingClelio = clelio ? productTasks.filter(t => {
    if (t.assignee_id !== clelio.id) return false
    try {
      const parsed = JSON.parse(t.description || '{}')
      return parsed.is_ready !== true
    } catch {
      return true // Se não conseguir parse, considera pendente
    }
  }).length : 0

  const pendingDanilo = danilo ? productTasks.filter(t => {
    if (t.assignee_id !== danilo.id) return false
    try {
      const parsed = JSON.parse(t.description || '{}')
      return parsed.is_ready !== true
    } catch {
      return true // Se não conseguir parse, considera pendente
    }
  }).length : 0

  return {
    totalTasks,
    completedTasks,
    activeTasks,
    pendingTasks,
    completionRate,
    lastCreative,
    pendingClelio,
    pendingDanilo
  }
}

// Extrair número do criativo de um title com nomenclatura
export function extractCreativeNumber(title: string): number | null {
  const match = title.match(/^#(\d+)-/)
  return match ? parseInt(match[1], 10) : null
}

// Obter próximo número disponível para um produto
export function getNextCreativeNumber(tasks: any[], productId: string, workflowType: WorkflowType = "criativos"): number {
  const product = getProductById(productId)
  if (!product?.nomenclature) return 1
  
  const productTasks = tasks.filter(t => 
    t.tag === workflowType && t.owner === productId
  )
  
  const existingNumbers = productTasks
    .map(task => extractCreativeNumber(task.title))
    .filter((num): num is number => num !== null)
    .sort((a, b) => b - a)
  
  return existingNumbers.length > 0 ? existingNumbers[0] + 1 : product.nomenclature.numeracao_inicial
}

// Helper function to get first name in uppercase from initials or name
function getFirstNameFromInitials(initials: string): string {
  if (!initials || initials === "AUTO" || initials === "") return ""
  
  if (initials.includes(' - ')) {
    const namePart = initials.split(' - ')[0].trim()
    const firstName = namePart.split(' ')[0]
    return firstName.substring(0, 3).toUpperCase()
  }
  
  if (initials.length > 2) {
    const firstName = initials.trim().split(' ')[0]
    return firstName.substring(0, 3).toUpperCase()
  }
  
  return initials.toUpperCase()
}

// Gerar nomenclatura completa para um criativo
export function generateCreativeNomenclature(
  productId: string,
  numeroCreativo: number,
  numeroCb: number = 0,
  numeroHook: number = 1,
  numeroBody: number = 1,
  numeroEdicao: number = 0,
  iniciaisCopy: string = "",
  iniciaisEditor: string = "",
  fonteTrafego: string = "",
  copyFullName?: string,
  editorFullName?: string,
  proporcao?: string,
  formato?: string,
  numeroAvatar: string = "-",
  idioma?: string
): string {
  const product = getProductById(productId)
  if (!product?.nomenclature) return "NOVO CRIATIVO"
  
  const { prefixo_oferta, iniciais_copy_padrao, iniciais_editor_padrao, fonte_trafego_padrao } = product.nomenclature
  
  let finalCopy = ""
  let finalEditor = ""
  
  if (copyFullName) {
    finalCopy = copyFullName.trim().split(' ')[0].substring(0, 3).toUpperCase()
  } else if (iniciaisCopy && iniciaisCopy !== "AUTO") {
    finalCopy = getFirstNameFromInitials(iniciaisCopy)
  } else if (iniciais_copy_padrao && iniciais_copy_padrao !== "AUTO") {
    finalCopy = getFirstNameFromInitials(iniciais_copy_padrao)
  }
  
  if (editorFullName) {
    finalEditor = editorFullName.trim().split(' ')[0].substring(0, 3).toUpperCase()
  } else if (iniciaisEditor && iniciaisEditor !== "AUTO") {
    finalEditor = getFirstNameFromInitials(iniciaisEditor)
  } else if (iniciais_editor_padrao && iniciais_editor_padrao !== "AUTO") {
    finalEditor = getFirstNameFromInitials(iniciais_editor_padrao)
  }
  
  const finalFonteTrafego = (fonteTrafego || fonte_trafego_padrao).toUpperCase()
  const prefixo = prefixo_oferta.toUpperCase()
  
  const proporcaoCode = proporcao ? proporcao.replace(':', 'x') : ''
  const formatoCode = formato ? formato.substring(0, 3).toUpperCase() : ''
  
  let idiomaCode = 'EN'
  if (idioma) {
    if (idioma === 'EN-UK') {
      idiomaCode = 'UK'
    } else {
      idiomaCode = idioma.split('-')[0].toUpperCase()
    }
  }
  
  return `#${numeroCreativo}-${prefixo}-${proporcaoCode}-${formatoCode}-${numeroAvatar}-${idiomaCode}-CB${numeroCb}-H${numeroHook}-B${numeroBody}-R${numeroEdicao}-${finalCopy}-${finalEditor}-${finalFonteTrafego}`
}

// Gerar nomenclatura para Leads
export function generateLeadNomenclature(
  productId: string,
  numeroLead: number,
  iniciaisCopy: string = "",
  iniciaisEditor: string = "",
  fonteTrafego: string = "",
  idioma: string = "EN-US",
  avatar: string = "",
  formato: string = "",
  copyFullName?: string,
  editorFullName?: string
): string {
  const product = getProductById(productId)
  if (!product?.nomenclature) return "NOVO LEAD"
  
  const { prefixo_oferta, iniciais_copy_padrao, iniciais_editor_padrao, fonte_trafego_padrao } = product.nomenclature
  
  let finalCopy = ""
  if (copyFullName && copyFullName.trim()) {
    // Usar primeiro nome completo do copywriter
    const firstName = copyFullName.trim().split(' ')[0]
    finalCopy = firstName.toUpperCase()
      .replace(/[ÀÁÂÃÄÅÆ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖØ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/[^A-Z]/g, '')
  } else if (iniciaisCopy && iniciaisCopy !== "AUTO") {
    finalCopy = getFirstNameFromInitials(iniciaisCopy)
  } else if (iniciais_copy_padrao && iniciais_copy_padrao !== "AUTO") {
    finalCopy = getFirstNameFromInitials(iniciais_copy_padrao)
  }
  
  let finalEditor = ""
  if (editorFullName && editorFullName.trim()) {
    // Usar primeiro nome completo do editor
    const firstName = editorFullName.trim().split(' ')[0]
    finalEditor = firstName.toUpperCase()
      .replace(/[ÀÁÂÃÄÅÆ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖØ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/[^A-Z]/g, '')
  } else if (iniciaisEditor && iniciaisEditor !== "AUTO") {
    finalEditor = getFirstNameFromInitials(iniciaisEditor)
  } else if (iniciais_editor_padrao && iniciais_editor_padrao !== "AUTO") {
    finalEditor = getFirstNameFromInitials(iniciais_editor_padrao)
  }
  
  const finalFonteTrafego = (fonteTrafego || fonte_trafego_padrao).toUpperCase()
  const prefixo = prefixo_oferta.toUpperCase()
  
  // Formatar idioma para código
  let idiomaCode = 'INGLES'
  if (idioma) {
    if (idioma === 'EN-US' || idioma === 'EN-UK') {
      idiomaCode = 'INGLES'
    } else if (idioma === 'PT-BR') {
      idiomaCode = 'PORTUGUES'
    } else if (idioma === 'ES') {
      idiomaCode = 'ESPANHOL'
    } else if (idioma === 'DE') {
      idiomaCode = 'ALEMAO'
    } else if (idioma === 'FR') {
      idiomaCode = 'FRANCES'
    } else if (idioma === 'IT') {
      idiomaCode = 'ITALIANO'
    } else {
      idiomaCode = idioma.split('-')[0].toUpperCase()
    }
  }
  
  const formatoCode = formato ? formato.substring(0, 3).toUpperCase() : 'FORMATO'
  
  // Formato: #1-MEMO-LEAD-INGLES-AVATAR-FORMATO-NOME DO EDITOR-NOME DO COPYWRITER
  return `#${numeroLead}-${prefixo}-LEAD-${idiomaCode}-${(avatar || 'AVATAR')}-${formatoCode}-${finalEditor}-${finalCopy}`
}

// Gerar nomenclatura para VSL
export function generateVslNomenclature(
  productId: string,
  numeroVsl: number,
  iniciaisCopy: string = "",
  iniciaisEditor: string = "",
  fonteTrafego: string = "",
  idioma: string = "EN-US",
  avatar: string = "",
  formato: string = "",
  duracao?: string,
  copyFullName?: string,
  editorFullName?: string
): string {
  const product = getProductById(productId)
  if (!product?.nomenclature) return "NOVO VSL"
  
  const { prefixo_oferta, iniciais_copy_padrao, iniciais_editor_padrao, fonte_trafego_padrao } = product.nomenclature
  
  let finalCopy = ""
  if (copyFullName && copyFullName.trim()) {
    // Usar primeiro nome completo do copywriter
    const firstName = copyFullName.trim().split(' ')[0]
    finalCopy = firstName.toUpperCase()
      .replace(/[ÀÁÂÃÄÅÆ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖØ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/[^A-Z]/g, '')
  } else if (iniciaisCopy && iniciaisCopy !== "AUTO") {
    finalCopy = getFirstNameFromInitials(iniciaisCopy)
  } else if (iniciais_copy_padrao && iniciais_copy_padrao !== "AUTO") {
    finalCopy = getFirstNameFromInitials(iniciais_copy_padrao)
  }
  
  let finalEditor = ""
  if (editorFullName && editorFullName.trim()) {
    // Usar primeiro nome completo do editor
    const firstName = editorFullName.trim().split(' ')[0]
    finalEditor = firstName.toUpperCase()
      .replace(/[ÀÁÂÃÄÅÆ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖØ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/[^A-Z]/g, '')
  } else if (iniciaisEditor && iniciaisEditor !== "AUTO") {
    finalEditor = getFirstNameFromInitials(iniciaisEditor)
  } else if (iniciais_editor_padrao && iniciais_editor_padrao !== "AUTO") {
    finalEditor = getFirstNameFromInitials(iniciais_editor_padrao)
  }
  
  const finalFonteTrafego = (fonteTrafego || fonte_trafego_padrao).toUpperCase()
  const prefixo = prefixo_oferta.toUpperCase()
  
  // Formatar idioma para código
  let idiomaCode = 'INGLES'
  if (idioma) {
    if (idioma === 'EN-US' || idioma === 'EN-UK') {
      idiomaCode = 'INGLES'
    } else if (idioma === 'PT-BR') {
      idiomaCode = 'PORTUGUES'
    } else if (idioma === 'ES') {
      idiomaCode = 'ESPANHOL'
    } else if (idioma === 'DE') {
      idiomaCode = 'ALEMAO'
    } else if (idioma === 'FR') {
      idiomaCode = 'FRANCES'
    } else if (idioma === 'IT') {
      idiomaCode = 'ITALIANO'
    } else {
      idiomaCode = idioma.split('-')[0].toUpperCase()
    }
  }
  
  const formatoCode = formato ? formato.substring(0, 3).toUpperCase() : 'FORMATO'
  
  // Formato: #1-MEMO-VSL-LINGUA-AVATAR-FORMATO-NOME DO EDITOR-NOME DO COPYWRITER
  return `#${numeroVsl}-${prefixo}-VSL-${idiomaCode}-${(avatar || 'AVATAR')}-${formatoCode}-${finalEditor}-${finalCopy}`
}

// Obter próximo número global de Hook
export function getNextGlobalHookNumber(tasks: any[], productId: string, workflowType: WorkflowType = "criativos"): number {
  const productTasks = tasks.filter(t => 
    t.tag === workflowType && t.owner === productId
  )
  
  let maxHookNumber = 0
  
  for (const task of productTasks) {
    try {
      const parsed = JSON.parse(task.description || '{}')
      const hookNumber = parsed.numero_hook || 1
      if (hookNumber > maxHookNumber) {
        maxHookNumber = hookNumber
      }
    } catch {
      if (maxHookNumber === 0) maxHookNumber = 1
    }
  }
  
  return maxHookNumber + 1
}

// Obter próximo número global de Body
export function getNextGlobalBodyNumber(tasks: any[], productId: string, workflowType: WorkflowType = "criativos"): number {
  const productTasks = tasks.filter(t => 
    t.tag === workflowType && t.owner === productId
  )
  
  let maxBodyNumber = 0
  
  for (const task of productTasks) {
    try {
      const parsed = JSON.parse(task.description || '{}')
      const bodyNumber = parsed.numero_body || 1
      if (bodyNumber > maxBodyNumber) {
        maxBodyNumber = bodyNumber
      }
    } catch {
      if (maxBodyNumber === 0) maxBodyNumber = 1
    }
  }
  
  return maxBodyNumber + 1
}

// Obter próximo número global de Clickbait
export function getNextGlobalClickbaitNumber(tasks: any[], productId: string): number {
  return 0 // CB sempre começa em 0 para novos criativos
}

// Função específica para obter próximo número de clickbait quando explicitamente solicitado
export function getNextClickbaitVariationNumber(tasks: any[], productId: string, workflowType: WorkflowType = "criativos"): number {
  const productTasks = tasks.filter(t => 
    t.tag === workflowType && t.owner === productId
  )
  
  let maxClickbaitNumber = 0
  
  for (const task of productTasks) {
    try {
      const parsed = JSON.parse(task.description || '{}')
      const clickbaitNumber = parsed.numero_clickbait || 0
      if (clickbaitNumber > maxClickbaitNumber) {
        maxClickbaitNumber = clickbaitNumber
      }
    } catch {
      // Continua sem fazer nada se não conseguir parsear
    }
  }
  
  return maxClickbaitNumber + 1
}

// Carregar nomenclaturas na inicialização (sem bloquear se der erro)
if (typeof window !== 'undefined') {
  loadNomenclatures().catch(() => {
  })
}