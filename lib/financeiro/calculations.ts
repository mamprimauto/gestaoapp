// ========================================
// Cálculos Financeiros - Utilitários
// ========================================

import { 
  FinancialData, 
  FinancialDashboardData, 
  FinancialBreakdown,
  FinancialDataWithRelations 
} from './types'

// ========================================
// Formatação de valores
// ========================================

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// ========================================
// Cálculos principais
// ========================================

export const calculateTaxes = (revenue: number, taxPercentage: number): number => {
  return (revenue * taxPercentage) / 100
}

export const calculateNetProfit = (
  revenue: number,
  facebookInvestment: number,
  googleInvestment: number,
  returnAmount: number,
  taxes: number,
  toolsCost: number,
  employeeCost: number
): number => {
  return revenue - returnAmount - facebookInvestment - googleInvestment - taxes - toolsCost - employeeCost
}

export const calculateProfitMargin = (netProfit: number, revenue: number): number => {
  if (revenue === 0) return 0
  return (netProfit / revenue) * 100
}

export const calculateMyProfit = (netProfit: number, profitPercentage: number): number => {
  return (netProfit * profitPercentage) / 100
}

// ========================================
// Geração do breakdown financeiro
// ========================================

export const generateFinancialBreakdown = (data: FinancialData): FinancialBreakdown[] => {
  const breakdown: FinancialBreakdown[] = [
    {
      nome: "Faturamento",
      valor: data.revenue,
      percentual: 100,
      tipo: "receita",
      descricao: "Receita bruta total do mês"
    }
  ]

  if (data.return_amount > 0) {
    breakdown.push({
      nome: "(-) Devoluções",
      valor: data.return_amount,
      percentual: (data.return_amount / data.revenue) * 100,
      tipo: "gasto",
      descricao: "Valor total de devoluções e estornos"
    })
  }

  if (data.facebook_investment > 0) {
    breakdown.push({
      nome: "(-) Investimento Facebook",
      valor: data.facebook_investment,
      percentual: (data.facebook_investment / data.revenue) * 100,
      tipo: "gasto",
      descricao: "Valor investido em anúncios no Facebook/Meta"
    })
  }

  if (data.google_investment > 0) {
    breakdown.push({
      nome: "(-) Investimento Google Ads",
      valor: data.google_investment,
      percentual: (data.google_investment / data.revenue) * 100,
      tipo: "gasto",
      descricao: "Valor investido em Google Ads"
    })
  }

  if (data.taxes > 0) {
    breakdown.push({
      nome: "(-) Impostos",
      valor: data.taxes,
      percentual: (data.taxes / data.revenue) * 100,
      tipo: "gasto",
      descricao: `Impostos sobre faturamento (${data.tax_percentage}%)`
    })
  }

  if (data.total_employee_cost > 0) {
    breakdown.push({
      nome: "(-) Custos Fixos por Colaborador",
      valor: data.total_employee_cost,
      percentual: (data.total_employee_cost / data.revenue) * 100,
      tipo: "gasto",
      descricao: "Salários e encargos da equipe"
    })
  }

  if (data.total_tools_cost > 0) {
    breakdown.push({
      nome: "(-) Custo Ferramentas",
      valor: data.total_tools_cost,
      percentual: (data.total_tools_cost / data.revenue) * 100,
      tipo: "gasto",
      descricao: "Assinaturas de softwares e ferramentas"
    })
  }

  return breakdown
}

// ========================================
// Transformação para dados do dashboard
// ========================================

export const transformToAshboardData = (data: FinancialDataWithRelations): FinancialDashboardData => {
  const netProfit = calculateNetProfit(
    data.revenue,
    data.facebook_investment,
    data.google_investment,
    data.return_amount,
    data.taxes,
    data.total_tools_cost,
    data.total_employee_cost
  )

  const profitMargin = calculateProfitMargin(netProfit, data.revenue)
  const myProfit = calculateMyProfit(netProfit, data.profit_percentage)

  return {
    faturamento: data.revenue,
    margemLucro: profitMargin,
    devolucoes: data.return_amount,
    meuLucro: myProfit,
    lucroLiquido: netProfit,
    breakdown: generateFinancialBreakdown(data),
    ferramentas: data.tools
      ?.filter(tool => tool.is_active)
      .sort((a, b) => b.cost - a.cost)
      .map(tool => ({
        nome: tool.name,
        valor: tool.cost
      })) || [],
    colaboradores: data.employees
      ?.filter(emp => emp.is_active)
      .sort((a, b) => b.salary - a.salary)
      .map(emp => ({
        funcao: emp.role,
        nome: emp.name,
        valor: emp.salary
      })) || [],
    totalFerramentas: data.total_tools_cost,
    totalColaboradores: data.total_employee_cost
  }
}

// ========================================
// Validações
// ========================================

export const validateFinancialData = (data: any): string[] => {
  const errors: string[] = []

  if (!data.month || data.month < 1 || data.month > 12) {
    errors.push('Mês deve estar entre 1 e 12')
  }

  if (!data.year || data.year < 2020 || data.year > 2030) {
    errors.push('Ano deve estar entre 2020 e 2030')
  }

  if (data.revenue < 0) {
    errors.push('Faturamento não pode ser negativo')
  }

  if (data.facebook_investment < 0) {
    errors.push('Investimento Facebook não pode ser negativo')
  }

  if (data.google_investment < 0) {
    errors.push('Investimento Google não pode ser negativo')
  }

  if (data.tax_percentage < 0 || data.tax_percentage > 100) {
    errors.push('Percentual de imposto deve estar entre 0 e 100')
  }

  if (data.return_amount < 0) {
    errors.push('Valor de devoluções deve ser maior ou igual a 0')
  }

  if (data.profit_percentage < 0 || data.profit_percentage > 100) {
    errors.push('Percentual de comissão deve estar entre 0 e 100')
  }

  return errors
}

export const validateFinancialTool = (tool: any): string[] => {
  const errors: string[] = []

  if (!tool.name || tool.name.trim().length === 0) {
    errors.push('Nome da ferramenta é obrigatório')
  }

  if (tool.cost < 0) {
    errors.push('Custo da ferramenta não pode ser negativo')
  }

  if (tool.category && !['software', 'hardware', 'service', 'other'].includes(tool.category)) {
    errors.push('Categoria da ferramenta é inválida')
  }

  return errors
}

export const validateFinancialEmployee = (employee: any): string[] => {
  const errors: string[] = []

  if (!employee.name || employee.name.trim().length === 0) {
    errors.push('Nome do colaborador é obrigatório')
  }

  if (!employee.role || employee.role.trim().length === 0) {
    errors.push('Função do colaborador é obrigatória')
  }

  if (employee.salary < 0) {
    errors.push('Salário não pode ser negativo')
  }

  if (employee.department && !['editor', 'copywriter', 'gestor_trafego', 'minerador', 'admin', 'geral'].includes(employee.department)) {
    errors.push('Departamento é inválido')
  }

  if (employee.employment_type && !['clt', 'pj', 'freelancer'].includes(employee.employment_type)) {
    errors.push('Tipo de contratação é inválido')
  }

  return errors
}

// ========================================
// Comparações e análises
// ========================================

export const compareMonths = (current: FinancialData, previous: FinancialData) => {
  const revenueGrowth = previous.revenue > 0 
    ? ((current.revenue - previous.revenue) / previous.revenue) * 100 
    : 0

  const profitGrowth = previous.net_profit > 0 
    ? ((current.net_profit - previous.net_profit) / previous.net_profit) * 100 
    : 0

  const costsGrowth = previous.total_tools_cost + previous.total_employee_cost > 0 
    ? (((current.total_tools_cost + current.total_employee_cost) - (previous.total_tools_cost + previous.total_employee_cost)) / (previous.total_tools_cost + previous.total_employee_cost)) * 100 
    : 0

  return {
    revenueGrowth,
    profitGrowth,
    costsGrowth,
    marginImprovement: current.profit_margin - previous.profit_margin
  }
}

export const calculateYearToDate = (monthlyData: FinancialData[]) => {
  const totals = monthlyData.reduce((acc, month) => ({
    revenue: acc.revenue + month.revenue,
    facebook_investment: acc.facebook_investment + month.facebook_investment,
    google_investment: acc.google_investment + month.google_investment,
    taxes: acc.taxes + month.taxes,
    total_tools_cost: acc.total_tools_cost + month.total_tools_cost,
    total_employee_cost: acc.total_employee_cost + month.total_employee_cost,
    net_profit: acc.net_profit + month.net_profit
  }), {
    revenue: 0,
    facebook_investment: 0,
    google_investment: 0,
    taxes: 0,
    total_tools_cost: 0,
    total_employee_cost: 0,
    net_profit: 0
  })

  const averageMargin = monthlyData.length > 0 
    ? monthlyData.reduce((sum, month) => sum + month.profit_margin, 0) / monthlyData.length
    : 0

  return {
    ...totals,
    averageMargin,
    monthsCount: monthlyData.length
  }
}