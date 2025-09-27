// ========================================
// Tipos TypeScript - Sistema Financeiro
// ========================================

export interface FinancialData {
  id: string
  organization_id: string
  user_id: string
  month: number
  year: number
  
  // Dados financeiros principais
  revenue: number // faturamento
  facebook_investment: number
  google_investment: number
  taxes: number // impostos
  tax_percentage: number // % de imposto configurável
  return_amount: number // devoluções em reais
  profit_percentage: number // % comissão do usuário
  
  // Totais calculados
  total_tools_cost: number
  total_employee_cost: number
  net_profit: number
  profit_margin: number
  
  created_at: string
  updated_at: string
  
  // Relacionamentos (quando incluídos)
  tools?: FinancialTool[]
  employees?: FinancialEmployee[]
}

export interface FinancialTool {
  id: string
  financial_data_id: string
  name: string
  cost: number
  category: 'software' | 'hardware' | 'service' | 'other'
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FinancialEmployee {
  id: string
  financial_data_id: string
  name: string
  role: string // função/cargo
  salary: number
  department: 'editor' | 'copywriter' | 'gestor_trafego' | 'minerador' | 'admin' | 'geral'
  employment_type: 'clt' | 'pj' | 'freelancer'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FinancialGoal {
  id: string
  organization_id: string
  month: number
  year: number
  target_revenue: number
  target_profit_margin: number
  max_facebook_investment: number
  max_google_investment: number
  max_tools_cost: number
  max_employee_cost: number
  created_at: string
  updated_at: string
}

// ========================================
// DTOs (Data Transfer Objects)
// ========================================

export interface CreateFinancialDataDTO {
  month: number
  year: number
  revenue: number
  facebook_investment?: number
  google_investment?: number
  tax_percentage?: number
  return_amount?: number
  profit_percentage?: number
}

export interface UpdateFinancialDataDTO {
  revenue?: number
  facebook_investment?: number
  google_investment?: number
  tax_percentage?: number
  return_amount?: number
  profit_percentage?: number
}

export interface CreateFinancialToolDTO {
  financial_data_id: string
  name: string
  cost: number
  category?: 'software' | 'hardware' | 'service' | 'other'
  description?: string
}

export interface UpdateFinancialToolDTO {
  name?: string
  cost?: number
  category?: 'software' | 'hardware' | 'service' | 'other'
  description?: string
  is_active?: boolean
}

export interface CreateFinancialEmployeeDTO {
  financial_data_id: string
  name: string
  role: string
  salary: number
  department?: 'editor' | 'copywriter' | 'gestor_trafego' | 'minerador' | 'admin' | 'geral'
  employment_type?: 'clt' | 'pj' | 'freelancer'
}

export interface UpdateFinancialEmployeeDTO {
  name?: string
  role?: string
  salary?: number
  department?: 'editor' | 'copywriter' | 'gestor_trafego' | 'minerador' | 'admin' | 'geral'
  employment_type?: 'clt' | 'pj' | 'freelancer'
  is_active?: boolean
}

// ========================================
// Response Types
// ========================================

export interface FinancialDataResponse {
  success: boolean
  data?: FinancialData
  error?: string
}

export interface FinancialDataListResponse {
  success: boolean
  data?: FinancialData[]
  error?: string
}

export interface FinancialToolResponse {
  success: boolean
  data?: FinancialTool
  error?: string
}

export interface FinancialEmployeeResponse {
  success: boolean
  data?: FinancialEmployee
  error?: string
}

// ========================================
// Dados calculados para o dashboard
// ========================================

export interface FinancialBreakdown {
  nome: string
  valor: number
  percentual: number
  tipo: 'receita' | 'gasto'
  descricao: string
}

export interface FinancialDashboardData {
  faturamento: number
  margemLucro: number
  percentualDevolucoes: number
  meuLucro: number
  lucroLiquido: number
  breakdown: FinancialBreakdown[]
  ferramentas: Array<{ nome: string; valor: number }>
  colaboradores: Array<{ funcao: string; nome: string; valor: number }>
  totalFerramentas: number
  totalColaboradores: number
}

// ========================================
// Filtros e Query Params
// ========================================

export interface FinancialQueryParams {
  month?: number
  year?: number
  organization_id?: string
  include_tools?: boolean
  include_employees?: boolean
}

export interface FinancialDateRange {
  start_month: number
  start_year: number
  end_month: number
  end_year: number
}

// ========================================
// Constantes e Enums
// ========================================

export const TOOL_CATEGORIES = [
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'service', label: 'Serviço' },
  { value: 'other', label: 'Outros' }
] as const

export const EMPLOYMENT_TYPES = [
  { value: 'clt', label: 'CLT' },
  { value: 'pj', label: 'PJ' },
  { value: 'freelancer', label: 'Freelancer' }
] as const

export const DEPARTMENTS = [
  { value: 'admin', label: 'Administrador', icon: '🛡️' },
  { value: 'editor', label: 'Editor', icon: '🎬' },
  { value: 'copywriter', label: 'Copywriter', icon: '✏️' },
  { value: 'gestor_trafego', label: 'Gestor de Tráfego', icon: '📊' },
  { value: 'minerador', label: 'Minerador', icon: '⛏️' },
  { value: 'geral', label: 'Geral', icon: '👤' }
] as const

export const MONTHS = [
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
] as const

// ========================================
// Utility Types
// ========================================

export type FinancialDataWithRelations = FinancialData & {
  tools: FinancialTool[]
  employees: FinancialEmployee[]
}

export type MonthName = typeof MONTHS[number]['label']
export type MonthNumber = typeof MONTHS[number]['value']
export type ToolCategory = typeof TOOL_CATEGORIES[number]['value']
export type EmploymentType = typeof EMPLOYMENT_TYPES[number]['value']
export type DepartmentType = typeof DEPARTMENTS[number]['value']