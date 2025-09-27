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

// Produtos com nomenclatura padrão
const nutraMemoria: Product = {
  id: "nutra-memoria",
  name: "Nutra Memória", 
  description: "Nutracêuticos do nicho de Memória",
  color: "#007AFF",
  bgGradient: "from-blue-500 to-blue-600",
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
  bgGradient: "from-orange-500 to-orange-600",
  icon: "⚖️",
  nomenclature: {
    prefixo_oferta: "NE",
    numeracao_inicial: 1,
    iniciais_copy_padrao: "AUTO",
    iniciais_editor_padrao: "AUTO",
    fonte_trafego_padrao: "FB"
  }
}

// Criar array mutável para permitir atualizações
export const PRODUCTS: Product[] = [nutraMemoria, nutraEmagrecimento]

// Função para atualizar nomenclatura do produto
export function updateProductNomenclature(productId: string, nomenclature: ProductNomenclature): boolean {
  const product = PRODUCTS.find(p => p.id === productId)
  if (product) {
    product.nomenclature = nomenclature
    // Salvar no localStorage para persistir entre recargas
    if (typeof window !== 'undefined') {
      localStorage.setItem(`product-nomenclature-${productId}`, JSON.stringify(nomenclature))
    }
    return true
  }
  return false
}

// Carregar nomenclatura do localStorage na inicialização
if (typeof window !== 'undefined') {
  PRODUCTS.forEach(product => {
    const saved = localStorage.getItem(`product-nomenclature-${product.id}`)
    if (saved) {
      try {
        product.nomenclature = JSON.parse(saved)
      } catch (e) {

      }
    }
  })
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id)
}

export function getProductByIdSync(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id)
}

export function getProductStats(tasks: any[], productId: string) {
  const productTasks = tasks.filter(t => 
    t.tag === "criativos" && t.owner === productId
  )
  
  const totalTasks = productTasks.length
  const completedTasks = productTasks.filter(t => t.status === "done").length
  const activeTasks = totalTasks - completedTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  // Último criativo adicionado
  const lastCreative = productTasks.length > 0 
    ? productTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null
  
  return {
    totalTasks,
    completedTasks,
    activeTasks,
    completionRate,
    lastCreative
  }
}

// Extrair número do criativo de um title com nomenclatura
export function extractCreativeNumber(title: string): number | null {
  // Regex para capturar o padrão #[número]-
  const match = title.match(/^#(\d+)-/)
  return match ? parseInt(match[1], 10) : null
}

// Obter próximo número disponível para um produto
export function getNextCreativeNumber(tasks: any[], productId: string): number {
  const product = getProductById(productId)
  if (!product?.nomenclature) return 1
  
  const productTasks = tasks.filter(t => 
    t.tag === "criativos" && t.owner === productId
  )
  
  // Extrair todos os números existentes
  const existingNumbers = productTasks
    .map(task => extractCreativeNumber(task.title))
    .filter((num): num is number => num !== null)
    .sort((a, b) => b - a) // Maior para menor
  
  // Retornar próximo número sequencial
  return existingNumbers.length > 0 ? existingNumbers[0] + 1 : product.nomenclature.numeracao_inicial
}

// Helper function to get first name in uppercase from initials or name
function getFirstNameFromInitials(initials: string): string {
  if (!initials || initials === "AUTO" || initials === "") return ""
  
  // Verificar se tem o formato "Nome Sobrenome - XX" e extrair apenas o nome
  if (initials.includes(' - ')) {
    const namePart = initials.split(' - ')[0].trim()
    const firstName = namePart.split(' ')[0]
    return firstName.substring(0, 3).toUpperCase()
  }
  
  // Se já tem mais de 2 caracteres, provavelmente é um nome, pegar apenas 3 primeiras letras
  if (initials.length > 2) {
    const firstName = initials.trim().split(' ')[0]
    return firstName.substring(0, 3).toUpperCase()
  }
  
  // Se são só iniciais, retornar as iniciais mesmo
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
  copyFullName?: string,  // Nome completo do copy (opcional)
  editorFullName?: string, // Nome completo do editor (opcional)
  proporcao?: string, // Proporção do criativo (opcional)
  formato?: string, // Formato do criativo (opcional)
  numeroAvatar: string = "-", // Número do avatar (opcional)
  idioma?: string // Idioma do criativo (opcional)
): string {
  const product = getProductById(productId)
  if (!product?.nomenclature) return "NOVO CRIATIVO"
  
  const { prefixo_oferta, iniciais_copy_padrao, iniciais_editor_padrao, fonte_trafego_padrao } = product.nomenclature
  
  // Usar nome completo se disponível, senão usar iniciais
  let finalCopy = ""
  let finalEditor = ""
  
  // Para Copy - usar apenas 3 primeiras letras
  if (copyFullName) {
    // Se tem nome completo, pegar apenas 3 primeiras letras do primeiro nome
    finalCopy = copyFullName.trim().split(' ')[0].substring(0, 3).toUpperCase()
  } else if (iniciaisCopy && iniciaisCopy !== "AUTO") {
    // Se tem iniciais mas não nome, usar iniciais
    finalCopy = getFirstNameFromInitials(iniciaisCopy)
  } else if (iniciais_copy_padrao && iniciais_copy_padrao !== "AUTO") {
    // Usar padrão se não for AUTO
    finalCopy = getFirstNameFromInitials(iniciais_copy_padrao)
  }
  
  // Para Editor - usar apenas 3 primeiras letras
  if (editorFullName) {
    // Se tem nome completo, pegar apenas 3 primeiras letras do primeiro nome
    finalEditor = editorFullName.trim().split(' ')[0].substring(0, 3).toUpperCase()
  } else if (iniciaisEditor && iniciaisEditor !== "AUTO") {
    // Se tem iniciais mas não nome, usar iniciais
    finalEditor = getFirstNameFromInitials(iniciaisEditor)
  } else if (iniciais_editor_padrao && iniciais_editor_padrao !== "AUTO") {
    // Usar padrão se não for AUTO
    finalEditor = getFirstNameFromInitials(iniciais_editor_padrao)
  }
  
  const finalFonteTrafego = (fonteTrafego || fonte_trafego_padrao).toUpperCase()
  const prefixo = prefixo_oferta.toUpperCase()
  
  // Formatar proporção: 9:16 → 9x16
  const proporcaoCode = proporcao ? proporcao.replace(':', 'x') : ''
  const formatoCode = formato ? formato.substring(0, 3).toUpperCase() : ''
  
  // Formatar idioma para código de 2 letras
  let idiomaCode = 'EN'
  if (idioma) {
    // Caso especial para EN-UK, mostrar UK
    if (idioma === 'EN-UK') {
      idiomaCode = 'UK'
    } else {
      // Para outros idiomas, pegar as primeiras 2 letras
      idiomaCode = idioma.split('-')[0].toUpperCase()
    }
  }
  
  return `#${numeroCreativo}-${prefixo}-${proporcaoCode}-${formatoCode}-${numeroAvatar}-${idiomaCode}-CB${numeroCb}-H${numeroHook}-B${numeroBody}-R${numeroEdicao}-${finalCopy}-${finalEditor}-${finalFonteTrafego}`
}

// Tipos para variações
export type VariationType = 'hook' | 'body' | 'clickbait' | 'edicao'

// Funções para numeração global única por tipo de variação

// Obter próximo número global de Hook (único em todo o projeto)
export function getNextGlobalHookNumber(tasks: any[], productId: string): number {
  const productTasks = tasks.filter(t => 
    t.tag === "criativos" && t.owner === productId
  )
  
  // Extrair todos os números de hook existentes de forma otimizada
  let maxHookNumber = 0
  
  for (const task of productTasks) {
    try {
      const parsed = JSON.parse(task.description || '{}')
      const hookNumber = parsed.numero_hook || 1
      if (hookNumber > maxHookNumber) {
        maxHookNumber = hookNumber
      }
    } catch {
      // Usar 1 se não conseguir parsear, mas não impacta o máximo
      if (maxHookNumber === 0) maxHookNumber = 1
    }
  }
  
  // Retornar próximo número global
  return maxHookNumber + 1
}

// Obter próximo número global de Body (único em todo o projeto)
export function getNextGlobalBodyNumber(tasks: any[], productId: string): number {
  const productTasks = tasks.filter(t => 
    t.tag === "criativos" && t.owner === productId
  )
  
  // Extrair todos os números de body existentes de forma otimizada
  let maxBodyNumber = 0
  
  for (const task of productTasks) {
    try {
      const parsed = JSON.parse(task.description || '{}')
      const bodyNumber = parsed.numero_body || 1
      if (bodyNumber > maxBodyNumber) {
        maxBodyNumber = bodyNumber
      }
    } catch {
      // Usar 1 se não conseguir parsear, mas não impacta o máximo
      if (maxBodyNumber === 0) maxBodyNumber = 1
    }
  }
  
  // Retornar próximo número global
  return maxBodyNumber + 1
}

// Obter próximo número global de Clickbait (único em todo o projeto)
// CB sempre começa em 0, só aumenta quando explicitamente adicionado
export function getNextGlobalClickbaitNumber(tasks: any[], productId: string): number {
  // CB sempre começa em 0 para novos criativos
  return 0
}

// Função específica para obter próximo número de clickbait quando explicitamente solicitado
export function getNextClickbaitVariationNumber(tasks: any[], productId: string): number {
  const productTasks = tasks.filter(t => 
    t.tag === "criativos" && t.owner === productId
  )
  
  // Extrair todos os números de clickbait existentes de forma otimizada
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
  
  // Retornar próximo número global
  return maxClickbaitNumber + 1
}

// Obter próximo número de Reedição (relativo ao pai específico)
// NOTA: Esta função é usada pelo createVariation para criativos principais
export function getNextReeditionNumber(tasks: any[], parentTask: any): number {
  if (!parentTask) return 1
  
  // Buscar todas as variações de reedição deste pai específico
  const reeditionVariations = tasks.filter(task => {
    try {
      const parsed = JSON.parse(task.description || '{}')
      // Verificar se é uma variação de reedição do mesmo pai
      return (
        parsed._parent_id === parentTask.id && 
        parsed._variation_type === 'edicao'
      ) || task.id === parentTask.id // incluir o próprio pai
    } catch {
      return false
    }
  })
  
  // Extrair números de reedição existentes para este pai
  let maxExistingNumber = 0
  
  for (const task of reeditionVariations) {
    try {
      const parsed = JSON.parse(task.description || '{}')
      const num = parsed.numero_edicao || 0
      if (num > maxExistingNumber) {
        maxExistingNumber = num
      }
    } catch {
      // Continua sem fazer nada se não conseguir parsear
    }
  }
  
  // Retornar próximo número sequencial baseado no pai
  return maxExistingNumber + 1
}

// Obter próximo número para uma variação específica (agora usa numeração global)
export function getNextVariationNumber(
  tasks: any[], 
  parentTask: any, 
  variationType: VariationType
): number {
  if (!parentTask) {
    // Usar numeração global mesmo sem parent
    switch (variationType) {
      case 'hook': return getNextGlobalHookNumber(tasks, parentTask?.owner || '')
      case 'body': return getNextGlobalBodyNumber(tasks, parentTask?.owner || '')
      case 'clickbait': return getNextClickbaitVariationNumber(tasks, parentTask?.owner || '')
      case 'edicao': return 1 // Reedição sem pai sempre começa em 1
      default: return 1
    }
  }
  
  // Usar numeração específica baseada no tipo
  switch (variationType) {
    case 'hook': return getNextGlobalHookNumber(tasks, parentTask.owner || '')
    case 'body': return getNextGlobalBodyNumber(tasks, parentTask.owner || '')
    case 'clickbait': return getNextClickbaitVariationNumber(tasks, parentTask.owner || '')
    case 'edicao': return getNextReeditionNumber(tasks, parentTask) // Numeração relativa ao pai
    default: return 1
  }
}

// Criar dados para uma variação baseada no criativo principal (usa numeração global)
export function createVariationData(
  parentTask: any,
  variationType: VariationType,
  tasks: any[], // Adicionar tasks para calcular números globais
  nextNumber: number
): any {
  try {
    const parentData = JSON.parse(parentTask.description || '{}')
    
    // Para variações, apenas o tipo específico recebe novo número
    // Os outros tipos mantêm o número do pai
    let hookNumber = parentData.numero_hook || 1
    let bodyNumber = parentData.numero_body || 1
    let clickbaitNumber = parentData.numero_clickbait || 0
    let edicaoNumber = parentData.numero_edicao || 0
    
    // Apenas o tipo da variação recebe novo número global
    if (variationType === 'hook') {
      hookNumber = nextNumber
    } else if (variationType === 'body') {
      bodyNumber = nextNumber
    } else if (variationType === 'clickbait') {
      clickbaitNumber = nextNumber
    } else if (variationType === 'edicao') {
      edicaoNumber = nextNumber
    }
    
    // Clonar dados do criativo principal
    const variationData = {
      ...parentData,
      // Usar números corretos para cada tipo
      numero_hook: hookNumber,
      numero_body: bodyNumber,
      numero_clickbait: clickbaitNumber,
      numero_edicao: edicaoNumber,
      // Variações sempre começam sem estado "pronto"
      is_ready: false,
      variation_requests: {} // Limpar pedidos de variação
    }
    
    return variationData
  } catch {
    // Fallback se não conseguir parsear
    let hookNumber = 1
    let bodyNumber = 1
    let clickbaitNumber = 0
    let edicaoNumber = 0
    
    // Apenas o tipo da variação recebe novo número global
    if (variationType === 'hook') {
      hookNumber = nextNumber
    } else if (variationType === 'body') {
      bodyNumber = nextNumber
    } else if (variationType === 'clickbait') {
      clickbaitNumber = nextNumber
    } else if (variationType === 'edicao') {
      edicaoNumber = nextNumber
    }
    
    return {
      hooks: [""],
      bodies: [""],
      checklist: [
        { text: "Tarefa 1", completed: false },
        { text: "Tarefa 2", completed: false },
        { text: "Tarefa 3", completed: false }
      ],
      numero_criativo: 1,
      prefixo_oferta: "",
      numero_clickbait: clickbaitNumber,
      numero_hook: hookNumber,
      numero_body: bodyNumber,
      numero_edicao: edicaoNumber,
      iniciais_copy: "",
      iniciais_editor: "",
      fonte_trafego: ""
    }
  }
}

// Gerar título para uma variação
export function generateVariationTitle(
  parentTask: any,
  variationType: VariationType,
  variationData: any
): string {
  if (!parentTask?.owner) return "Nova Variação"
  
  return generateCreativeNomenclature(
    parentTask.owner,
    variationData.numero_criativo,
    variationData.numero_clickbait,
    variationData.numero_hook,
    variationData.numero_body,
    variationData.numero_edicao,
    variationData.iniciais_copy,
    variationData.iniciais_editor,
    variationData.fonte_trafego
  )
}