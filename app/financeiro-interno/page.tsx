"use client"

import { useState, useEffect } from 'react'
import AdminGuard from '@/components/admin-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users,
  Calculator,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Loader2,
  Edit,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
]

// Gerar lista de meses/anos válidos (Setembro 2025 até Dezembro 2026)
const generateValidPeriods = () => {
  const periods = []
  
  // 2025: Setembro a Dezembro
  for (let month = 9; month <= 12; month++) {
    periods.push({ year: 2025, month })
  }
  
  // 2026: Janeiro a Dezembro
  for (let month = 1; month <= 12; month++) {
    periods.push({ year: 2026, month })
  }
  
  return periods
}

const VALID_PERIODS = generateValidPeriods()

interface InternalFinancialData {
  id: string
  month: number
  year: number
  faturamento_bruto: number
  numero_vendas: number
  equipe_fixa: number
  ferramentas: number
  investimento_google_ads: number
  investimento_facebook: number
  investimento_tiktok: number
  chargebacks: number
  reembolsos: number
  chargebacks_reembolsos: number
  taxa_plataforma_percentual: number
  imposto_percentual: number
  gestor_trafego_percentual: number
  copywriter_percentual: number
  taxa_plataforma: number
  imposto: number
  comissao_gestor_trafego: number
  comissao_copywriter: number
  roi: number
  ticket_medio: number
  percentual_reembolso_chargeback: number
  margem_contribuicao: number
  lucro_liquido: number
  custos_fixos: number
  custos_variaveis: number
}

interface Employee {
  id?: string
  nome: string
  cargo: string
  salario: number
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  displayName: string
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0)
}

const formatPercent = (value: number) => {
  return `${(value || 0).toFixed(2)}%`
}

export default function FinanceiroInternoPage() {
  const { toast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Usar setembro de 2025 como padrão se estamos antes de setembro 2025, senão usar mês atual se válido
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    
    // Se estamos em um período válido, usar o atual
    const isCurrentValid = VALID_PERIODS.some(p => p.year === currentYear && p.month === currentMonth)
    if (isCurrentValid) {
      return currentMonth
    }
    
    // Senão, usar setembro 2025 como padrão
    return 9
  })
  
  const [selectedYear, setSelectedYear] = useState(() => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    
    // Se estamos em um período válido, usar o atual
    const isCurrentValid = VALID_PERIODS.some(p => p.year === currentYear && p.month === currentMonth)
    if (isCurrentValid) {
      return currentYear
    }
    
    // Senão, usar 2025 como padrão
    return 2025
  })
  const [showForm, setShowForm] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [data, setData] = useState<InternalFinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState({
    faturamento_bruto: '',
    numero_vendas: '',
    ferramentas: 0, // Será calculado das ferramentas individuais
    investimento_google_ads: '',
    investimento_facebook: '',
    investimento_tiktok: '',
    chargebacks: '',
    reembolsos: '',
    taxa_plataforma_percentual: 0,
    imposto_percentual: 0,
    gestor_trafego_percentual: 0,
    copywriter_percentual: 0
  })

  // Estados para colaboradores
  const [colaboradores, setColaboradores] = useState<Array<{
    id?: string,
    nome: string,
    salario: number,
    cargo: string
  }>>([])

  const [novoColaborador, setNovoColaborador] = useState({
    nome: '',
    salario: 0,
    cargo: '',
    selectedMemberId: ''
  })

  // Estados para ferramentas
  const [ferramentas, setFerramentas] = useState<Array<{
    id?: string,
    nome: string,
    valor: number
  }>>([])

  const [novaFerramenta, setNovaFerramenta] = useState({
    nome: '',
    valor: 0,
    selectedToolName: ''
  })

  const [toolSuggestions, setToolSuggestions] = useState<{name: string, lastValue: number}[]>([])
  const [loadingToolSuggestions, setLoadingToolSuggestions] = useState(false)

  // Carregar dados
  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  // Carregar membros da equipe
  useEffect(() => {
    loadTeamMembers()
  }, [])

  const loadTeamMembers = async () => {
    try {
      setLoadingTeamMembers(true)
      const response = await fetch('/api/admin/internal-financial/team-members')
      
      if (response.ok) {
        const result = await response.json()
        setTeamMembers(result.data || [])
      } else {

      }
    } catch (error) {

    } finally {
      setLoadingTeamMembers(false)
    }
  }

  const createEmptyData = (): InternalFinancialData => ({
    id: '',
    month: selectedMonth,
    year: selectedYear,
    faturamento_bruto: 0,
    numero_vendas: 0,
    equipe_fixa: 0,
    ferramentas: 0,
    investimento_google_ads: 0,
    investimento_facebook: 0,
    investimento_tiktok: 0,
    chargebacks: 0,
    reembolsos: 0,
    chargebacks_reembolsos: 0,
    taxa_plataforma_percentual: 0,
    imposto_percentual: 0,
    gestor_trafego_percentual: 0,
    copywriter_percentual: 0,
    taxa_plataforma: 0,
    imposto: 0,
    comissao_gestor_trafego: 0,
    comissao_copywriter: 0,
    roi: 0,
    ticket_medio: 0,
    percentual_reembolso_chargeback: 0,
    margem_contribuicao: 0,
    lucro_liquido: 0,
    custos_fixos: 0,
    custos_variaveis: 0
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/internal-financial/data?month=${selectedMonth}&year=${selectedYear}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.data) {
          setData(result.data)
        } else {
          // Se não há dados, criar estrutura zerada
          setData(createEmptyData())
        }
      } else if (response.status === 404) {
        // Se não encontrou dados (404), criar estrutura zerada
        setData(createEmptyData())
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Falha ao carregar dados",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao conectar com o servidor",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setFormData({
      faturamento_bruto: '',
      numero_vendas: '',
      ferramentas: '',
      investimento_google_ads: '',
      investimento_facebook: '',
      investimento_tiktok: '',
      chargebacks: '',
      reembolsos: '',
      taxa_plataforma_percentual: '',
      imposto_percentual: '',
      gestor_trafego_percentual: '',
      copywriter_percentual: ''
    })
    setColaboradores([])
    setFerramentas([])
    setNovoColaborador({ nome: '', salario: 0, cargo: '', selectedMemberId: '' })
    setNovaFerramenta({ nome: '', valor: 0, selectedToolName: '' })
  }

  const openCreateModal = () => {
    setIsEditMode(false)
    clearForm()
    setShowForm(true)
  }

  const openEditModal = async () => {
    if (!data) return
    
    setIsEditMode(true)
    setFormData({
      faturamento_bruto: data.faturamento_bruto.toString(),
      numero_vendas: data.numero_vendas.toString(),
      ferramentas: data.ferramentas,
      investimento_google_ads: data.investimento_google_ads?.toString() || '',
      investimento_facebook: data.investimento_facebook?.toString() || '',
      investimento_tiktok: data.investimento_tiktok?.toString() || '',
      chargebacks: data.chargebacks?.toString() || '',
      reembolsos: data.reembolsos?.toString() || '',
      taxa_plataforma_percentual: data.taxa_plataforma_percentual || 0,
      imposto_percentual: data.imposto_percentual || 0,
      gestor_trafego_percentual: data.gestor_trafego_percentual || 0,
      copywriter_percentual: data.copywriter_percentual || 0
    })
    
    // Carregar colaboradores existentes - simular com base no valor total da equipe
    // Como não temos dados individuais salvos, vamos criar uma entrada genérica para edição
    if (data.equipe_fixa > 0) {
      setColaboradores([{
        id: 'equipe-existente',
        nome: 'Equipe Fixa',
        salario: data.equipe_fixa,
        cargo: 'Equipe'
      }])
    } else {
      setColaboradores([])
    }
    
    // Carregar ferramentas existentes - simular com base no valor total das ferramentas
    if (data.ferramentas > 0) {
      setFerramentas([{
        id: 'ferramentas-existentes',
        nome: 'Ferramentas',
        valor: data.ferramentas
      }])
    } else {
      setFerramentas([])
    }
    
    setNovoColaborador({ nome: '', salario: 0, cargo: '', selectedMemberId: '' })
    setNovaFerramenta({ nome: '', valor: 0, selectedToolName: '' })
    setShowForm(true)
  }

  // Funções para gerenciar colaboradores
  const adicionarColaborador = () => {
    if (novoColaborador.nome && novoColaborador.salario > 0 && novoColaborador.cargo) {
      setColaboradores(prev => [...prev, { 
        ...novoColaborador, 
        id: Date.now().toString() 
      }])
      setNovoColaborador({ nome: '', salario: 0, cargo: '', selectedMemberId: '' })
    }
  }

  const selecionarMembroEquipe = (memberId: string) => {
    if (memberId === 'custom') {
      setNovoColaborador(prev => ({
        ...prev,
        selectedMemberId: 'custom',
        nome: '',
        cargo: ''
      }))
    } else {
      const member = teamMembers.find(m => m.id === memberId)
      if (member) {
        setNovoColaborador(prev => ({
          ...prev,
          selectedMemberId: memberId,
          nome: member.name,
          cargo: member.role
        }))
      }
    }
  }

  const removerColaborador = (id: string) => {
    setColaboradores(prev => prev.filter(c => c.id !== id))
  }

  const calcularTotalColaboradores = () => {
    return colaboradores.reduce((total, col) => total + col.salario, 0)
  }

  const calcularTotalFerramentas = () => {
    return ferramentas.reduce((total, ferr) => total + ferr.valor, 0)
  }

  const adicionarFerramenta = () => {
    if (novaFerramenta.nome.trim() && novaFerramenta.valor > 0) {
      const ferramenta = {
        id: `ferramenta-${Date.now()}`,
        nome: novaFerramenta.nome.trim(),
        valor: novaFerramenta.valor
      }
      setFerramentas(prev => [...prev, ferramenta])
      
      // Atualizar sugestões com último valor usado
      const existingSuggestionIndex = toolSuggestions.findIndex(s => s.name === ferramenta.nome)
      let updatedSuggestions
      
      if (existingSuggestionIndex >= 0) {
        // Atualizar valor da ferramenta existente
        updatedSuggestions = [...toolSuggestions]
        updatedSuggestions[existingSuggestionIndex].lastValue = ferramenta.valor
      } else {
        // Adicionar nova ferramenta com valor
        updatedSuggestions = [...toolSuggestions, { name: ferramenta.nome, lastValue: ferramenta.valor }]
      }
      
      setToolSuggestions(updatedSuggestions)
      // Salvar sugestões com valores no localStorage
      localStorage.setItem('financeiro_tool_suggestions', JSON.stringify(updatedSuggestions))
      
      setNovaFerramenta({ nome: '', valor: 0, selectedToolName: '' })
    }
  }

  const removerFerramenta = (id: string) => {
    setFerramentas(prev => prev.filter(f => f.id !== id))
  }

  const selecionarFerramenta = (toolName: string) => {
    if (toolName === 'custom') {
      setNovaFerramenta(prev => ({ ...prev, selectedToolName: 'custom', nome: '', valor: 0 }))
    } else if (toolName) {
      // Encontrar o último valor usado para esta ferramenta
      const suggestion = toolSuggestions.find(s => s.name === toolName)
      const lastValue = suggestion?.lastValue || 0
      
      setNovaFerramenta(prev => ({ 
        ...prev, 
        selectedToolName: toolName, 
        nome: toolName, 
        valor: lastValue 
      }))
    } else {
      setNovaFerramenta(prev => ({ ...prev, selectedToolName: '', nome: '', valor: 0 }))
    }
  }

  // Carregar sugestões de ferramentas do localStorage
  useEffect(() => {
    const savedSuggestions = localStorage.getItem('financeiro_tool_suggestions')
    if (savedSuggestions) {
      try {
        const parsed = JSON.parse(savedSuggestions)
        
        // Verificar se é o formato antigo (array de strings) ou novo (array de objetos)
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          // Converter formato antigo para novo
          const convertedSuggestions = parsed.map((name: string) => ({ name, lastValue: 0 }))
          setToolSuggestions(convertedSuggestions)
          // Salvar no novo formato
          localStorage.setItem('financeiro_tool_suggestions', JSON.stringify(convertedSuggestions))
        } else {
          // Já está no formato novo
          setToolSuggestions(parsed)
        }
      } catch (error) {

      }
    }
  }, [])

  // Função para calcular valores em tempo real
  const calculateRealTimeValues = () => {
    const faturamento = Number(formData.faturamento_bruto) || 0
    const numeroVendas = Number(formData.numero_vendas) || 0
    const chargebacks = Number(formData.chargebacks) || 0
    const reembolsos = Number(formData.reembolsos) || 0
    const googleAds = Number(formData.investimento_google_ads) || 0
    const facebook = Number(formData.investimento_facebook) || 0
    const tiktok = Number(formData.investimento_tiktok) || 0
    
    const totalChargebacks = chargebacks + reembolsos
    const totalColaboradores = calcularTotalColaboradores()
    const totalFerramentas = calcularTotalFerramentas()
    
    const taxa_plataforma = faturamento * (formData.taxa_plataforma_percentual / 100)
    const imposto = faturamento * (formData.imposto_percentual / 100)
    
    const totalInvestimentos = googleAds + facebook + tiktok
    const lucro_bruto = faturamento - 
                       totalColaboradores - 
                       totalChargebacks - 
                       taxa_plataforma - 
                       imposto - 
                       totalFerramentas - 
                       totalInvestimentos
    
    // Comissões são percentuais do lucro bruto (só se tiver lucro positivo)
    const comissao_gestor = lucro_bruto > 0 ? lucro_bruto * (formData.gestor_trafego_percentual / 100) : 0
    const comissao_copywriter = lucro_bruto > 0 ? lucro_bruto * (formData.copywriter_percentual / 100) : 0
    
    // Lucro líquido desconta as comissões
    const lucro_liquido = lucro_bruto - comissao_gestor - comissao_copywriter
    
    const ticket_medio = numeroVendas > 0 ? faturamento / numeroVendas : 0
    const total_custos = totalColaboradores + totalChargebacks + taxa_plataforma + imposto + totalFerramentas + totalInvestimentos + comissao_gestor + comissao_copywriter
    const roi = total_custos > 0 ? (lucro_liquido / total_custos) * 100 : 0
    const percentual_chargeback = faturamento > 0 ? (chargebacks / faturamento) * 100 : 0
    const percentual_reembolso = faturamento > 0 ? (reembolsos / faturamento) * 100 : 0
    const margem_contribuicao = faturamento > 0 ? (lucro_bruto / faturamento) * 100 : 0

    return {
      taxa_plataforma,
      imposto,
      lucro_bruto,
      comissao_gestor,
      comissao_copywriter,
      lucro_liquido,
      ticket_medio,
      roi,
      percentual_chargeback,
      percentual_reembolso,
      margem_contribuicao,
      total_custos
    }
  }

  // Calcular valores em tempo real
  const calculatedValues = calculateRealTimeValues()

  const handleResetData = async () => {
    if (!data?.id) return

    // Confirmar com o usuário antes de resetar
    const confirmReset = window.confirm(
      `⚠️ ATENÇÃO: Isso irá apagar TODOS os dados financeiros de ${MONTHS.find(m => m.value === selectedMonth)?.label}/${selectedYear}.\n\n` +
      'O mês ficará como novo para ser preenchido novamente.\n\n' +
      'Tem certeza que deseja continuar?'
    )

    if (!confirmReset) return

    try {
      setSaving(true)
      
      // Deletar o registro completamente
      const response = await fetch(`/api/admin/internal-financial/data?id=${data.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Dados resetados com sucesso! Mês agora está disponível para novo preenchimento."
        })
        
        // Limpar dados locais
        setData(null)
        
        // Limpar formulário completamente
        clearForm()
        setColaboradores([])
        setFerramentas([])
        
        // Fecha o formulário
        setShowForm(false)
        setIsEditMode(false)
        
        // Força refresh dos dados
        await loadData()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Falha ao resetar dados",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao conectar com o servidor",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveData = async () => {
    try {
      setSaving(true)
      
      const totalColaboradores = calcularTotalColaboradores()
      const totalFerramentas = calcularTotalFerramentas()
      
      const dataToSave = {
        month: selectedMonth,
        year: selectedYear,
        faturamento_bruto: Number(formData.faturamento_bruto) || 0,
        numero_vendas: Number(formData.numero_vendas) || 0,
        ferramentas: totalFerramentas,
        investimento_google_ads: Number(formData.investimento_google_ads) || 0,
        investimento_facebook: Number(formData.investimento_facebook) || 0,
        investimento_tiktok: Number(formData.investimento_tiktok) || 0,
        chargebacks: Number(formData.chargebacks) || 0,
        reembolsos: Number(formData.reembolsos) || 0,
        taxa_plataforma_percentual: formData.taxa_plataforma_percentual,
        imposto_percentual: formData.imposto_percentual,
        gestor_trafego_percentual: formData.gestor_trafego_percentual,
        copywriter_percentual: formData.copywriter_percentual,
        equipe_fixa: totalColaboradores,
        ...(isEditMode && data ? { id: data.id } : {})
      }
      
      const response = await fetch('/api/admin/internal-financial/data', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Sucesso",
          description: isEditMode ? "Dados atualizados com sucesso!" : "Dados salvos com sucesso!"
        })
        
        // Força refresh dos dados imediatamente
        await loadData()
        
        // Reset form state
        setShowForm(false)
        setIsEditMode(false)
        
        // Reset form data to initial values
        clearForm()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Falha ao salvar dados",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao conectar com o servidor",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedMonthName = MONTHS.find(m => m.value === selectedMonth)?.label || 'Mês'

  // Renderizar formulário em tela cheia
  if (showForm) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-background">
          {/* Header do Formulário */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {isEditMode ? 'Editar' : 'Adicionar'} Dados Financeiros
                </h1>
                <p className="text-muted-foreground">
                  {isEditMode 
                    ? `Edite os dados financeiros de ${selectedMonthName} ${selectedYear}`
                    : `Preencha os dados financeiros de ${selectedMonthName} ${selectedYear}`
                  }
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowForm(false)}
                className="flex items-center gap-2"
              >
                ← Voltar
              </Button>
            </div>
          </div>

          {/* Formulário */}
          <div className="p-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Coluna Esquerda */}
              <div className="space-y-8">
                {/* Entradas */}
                <Card className="bg-green-50/30 border-green-200 dark:bg-green-900/10">
                  <CardContent className="p-6 space-y-6">
                    <h3 className="font-semibold text-green-600 flex items-center gap-2 text-lg">
                      <DollarSign className="w-5 h-5" />
                      Entradas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="faturamento">Faturamento Bruto (R$)</Label>
                        <Input
                          id="faturamento"
                          type="number"
                          step="0.01"
                          value={formData.faturamento_bruto}
                          onChange={(e) => setFormData(prev => ({...prev, faturamento_bruto: e.target.value}))}
                          placeholder="0.00"
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vendas">Número de Vendas</Label>
                        <Input
                          id="vendas"
                          type="number"
                          value={formData.numero_vendas}
                          onChange={(e) => setFormData(prev => ({...prev, numero_vendas: e.target.value}))}
                          placeholder="0"
                          className="text-lg"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custos Variáveis */}
                <Card className="bg-red-50/30 border-red-200 dark:bg-red-900/10">
                  <CardContent className="p-6 space-y-6">
                    <h3 className="font-semibold text-red-600 flex items-center gap-2 text-lg">
                      <TrendingDown className="w-5 h-5" />
                      Custos Variáveis
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="google_ads">Investimento Google Ads (R$)</Label>
                          <Input
                            id="google_ads"
                            type="number"
                            step="0.01"
                            value={formData.investimento_google_ads}
                            onChange={(e) => setFormData(prev => ({...prev, investimento_google_ads: e.target.value}))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="facebook">Investimento Facebook (R$)</Label>
                          <Input
                            id="facebook"
                            type="number"
                            step="0.01"
                            value={formData.investimento_facebook}
                            onChange={(e) => setFormData(prev => ({...prev, investimento_facebook: e.target.value}))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tiktok">Investimento TikTok (R$)</Label>
                          <Input
                            id="tiktok"
                            type="number"
                            step="0.01"
                            value={formData.investimento_tiktok}
                            onChange={(e) => setFormData(prev => ({...prev, investimento_tiktok: e.target.value}))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="chargebacks">Chargebacks (R$)</Label>
                          <Input
                            id="chargebacks"
                            type="number"
                            step="0.01"
                            value={formData.chargebacks}
                            onChange={(e) => setFormData(prev => ({...prev, chargebacks: e.target.value}))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="reembolsos">Reembolsos (R$)</Label>
                          <Input
                            id="reembolsos"
                            type="number"
                            step="0.01"
                            value={formData.reembolsos}
                            onChange={(e) => setFormData(prev => ({...prev, reembolsos: e.target.value}))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ferramentas">Ferramentas (R$)</Label>
                          <Input
                            id="ferramentas"
                            type="number"
                            step="0.01"
                            value={formData.ferramentas}
                            onChange={(e) => setFormData(prev => ({...prev, ferramentas: Number(e.target.value)}))}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Percentuais */}
                <Card className="bg-purple-50/30 border-purple-200 dark:bg-purple-900/10">
                  <CardContent className="p-6 space-y-6">
                    <h3 className="font-semibold text-purple-600 flex items-center gap-2 text-lg">
                      <Calculator className="w-5 h-5" />
                      Percentuais e Comissões
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="taxa_plataforma">Taxa Plataforma (% do faturamento)</Label>
                        <Input
                          id="taxa_plataforma"
                          type="number"
                          step="0.01"
                          value={formData.taxa_plataforma_percentual}
                          onChange={(e) => setFormData(prev => ({...prev, taxa_plataforma_percentual: Number(e.target.value)}))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="imposto">Imposto (% do faturamento)</Label>
                        <Input
                          id="imposto"
                          type="number"
                          step="0.01"
                          value={formData.imposto_percentual}
                          onChange={(e) => setFormData(prev => ({...prev, imposto_percentual: Number(e.target.value)}))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="gestor_trafego">Gestor Tráfego (% do lucro)</Label>
                        <Input
                          id="gestor_trafego"
                          type="number"
                          step="0.01"
                          value={formData.gestor_trafego_percentual}
                          onChange={(e) => setFormData(prev => ({...prev, gestor_trafego_percentual: Number(e.target.value)}))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="copywriter">Copywriter (% do lucro)</Label>
                        <Input
                          id="copywriter"
                          type="number"
                          step="0.01"
                          value={formData.copywriter_percentual}
                          onChange={(e) => setFormData(prev => ({...prev, copywriter_percentual: Number(e.target.value)}))}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-8">
                {/* Colaboradores - Custos Fixos */}
                <Card className="bg-blue-50/30 border-blue-200 dark:bg-blue-900/10">
                  <CardContent className="p-6 space-y-6">
                    <h3 className="font-semibold text-blue-600 flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5" />
                      Colaboradores (Custos Fixos)
                    </h3>
                    
                    {/* Lista de Colaboradores */}
                    {colaboradores.length > 0 && (
                      <div className="space-y-3">
                        {colaboradores.map((colaborador) => (
                          <div key={colaborador.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div>
                              <span className="font-medium">{colaborador.nome}</span>
                              <span className="text-sm text-muted-foreground ml-2">({colaborador.cargo})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-lg">{formatCurrency(colaborador.salario)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerColaborador(colaborador.id!)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="text-right text-lg font-bold text-blue-600">
                          Total: {formatCurrency(calcularTotalColaboradores())}
                        </div>
                      </div>
                    )}

                    {/* Adicionar Novo Colaborador */}
                    <Card className="border-2 border-dashed border-muted">
                      <CardContent className="p-4 space-y-4">
                        {/* Seleção de Membro da Equipe */}
                        <div className="space-y-2">
                          <Label>Selecionar Membro da Equipe</Label>
                          <Select 
                            value={novoColaborador.selectedMemberId} 
                            onValueChange={selecionarMembroEquipe}
                            disabled={loadingTeamMembers}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={loadingTeamMembers ? "Carregando..." : "Escolha um membro da equipe"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto z-[9999]">
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.displayName}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">✏️ Inserir manualmente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campos para salário */}
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="colaborador-salario">Salário (R$)</Label>
                            <Input
                              id="colaborador-salario"
                              type="number"
                              step="0.01"
                              value={novoColaborador.salario}
                              onChange={(e) => setNovoColaborador(prev => ({...prev, salario: Number(e.target.value)}))}
                              placeholder="0.00"
                              className="text-lg font-semibold"
                            />
                          </div>
                          
                          {/* Mostrar info do colaborador selecionado */}
                          {novoColaborador.selectedMemberId && novoColaborador.selectedMemberId !== 'custom' && (
                            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                              <strong>{novoColaborador.nome}</strong> - {novoColaborador.cargo}
                            </div>
                          )}
                          
                          {/* Campos manuais quando 'custom' */}
                          {novoColaborador.selectedMemberId === 'custom' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="colaborador-nome">Nome</Label>
                                <Input
                                  id="colaborador-nome"
                                  value={novoColaborador.nome}
                                  onChange={(e) => setNovoColaborador(prev => ({...prev, nome: e.target.value}))}
                                  placeholder="Ex: João Silva"
                                />
                              </div>
                              <div>
                                <Label htmlFor="colaborador-cargo">Cargo</Label>
                                <Input
                                  id="colaborador-cargo"
                                  value={novoColaborador.cargo}
                                  onChange={(e) => setNovoColaborador(prev => ({...prev, cargo: e.target.value}))}
                                  placeholder="Ex: Designer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          onClick={adicionarColaborador}
                          disabled={!novoColaborador.nome || !novoColaborador.cargo || novoColaborador.salario <= 0}
                          className="w-full"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Colaborador
                        </Button>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>

                {/* Ferramentas */}
                <Card className="bg-purple-50/30 border-purple-200 dark:bg-purple-900/10">
                  <CardContent className="p-6 space-y-6">
                    <h3 className="font-semibold text-purple-600 flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5" />
                      Ferramentas e Software
                    </h3>

                    {/* Lista de ferramentas */}
                    {ferramentas.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">Ferramentas Adicionadas:</h4>
                        {ferramentas.map((ferramenta) => (
                          <div key={ferramenta.id} className="flex items-center justify-between p-3 bg-white dark:bg-muted/10 rounded-lg border">
                            <div className="flex flex-col">
                              <span className="font-medium">{ferramenta.nome}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-lg">{formatCurrency(ferramenta.valor)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerFerramenta(ferramenta.id!)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="text-right text-lg font-bold text-purple-600">
                          Total: {formatCurrency(calcularTotalFerramentas())}
                        </div>
                      </div>
                    )}

                    {/* Adicionar Nova Ferramenta */}
                    <Card className="border-2 border-dashed border-muted">
                      <CardContent className="p-4 space-y-4">
                        {/* Seleção de Ferramenta */}
                        <div className="space-y-2">
                          <Label>Selecionar Ferramenta</Label>
                          <Select 
                            value={novaFerramenta.selectedToolName} 
                            onValueChange={selecionarFerramenta}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Escolha uma ferramenta ou adicione nova" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto z-[9999]">
                              {toolSuggestions.map((suggestion) => (
                                <SelectItem key={suggestion.name} value={suggestion.name}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{suggestion.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      R$ {suggestion.lastValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">✏️ Nova ferramenta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campos para ferramenta */}
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="ferramenta-valor">Valor Mensal (R$)</Label>
                            <Input
                              id="ferramenta-valor"
                              type="number"
                              step="0.01"
                              value={novaFerramenta.valor || ''}
                              onChange={(e) => setNovaFerramenta(prev => ({...prev, valor: Number(e.target.value)}))}
                              placeholder="0.00"
                              className="text-lg font-semibold"
                            />
                          </div>
                          
                          {/* Campo manual quando 'custom' ou mostrando nome selecionado */}
                          {(novaFerramenta.selectedToolName === 'custom' || !novaFerramenta.selectedToolName) ? (
                            <div>
                              <Label htmlFor="ferramenta-nome">Nome da Ferramenta</Label>
                              <Input
                                id="ferramenta-nome"
                                value={novaFerramenta.nome}
                                onChange={(e) => setNovaFerramenta(prev => ({...prev, nome: e.target.value}))}
                                placeholder="Ex: ChatGPT, Canva Pro, etc."
                                className="font-medium"
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                              <strong>{novaFerramenta.nome}</strong>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          onClick={adicionarFerramenta}
                          disabled={!novaFerramenta.nome || novaFerramenta.valor <= 0}
                          className="w-full"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Ferramenta
                        </Button>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Preview dos Cálculos */}
            <div className="mt-8">
              <Card className="bg-blue-50/30 border-blue-200 dark:bg-blue-900/10">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-blue-600 flex items-center gap-2 text-lg mb-4">
                    <Calculator className="w-5 h-5" />
                    Preview dos Cálculos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Taxa Plataforma</p>
                      <p className="font-semibold">R$ {calculatedValues.taxa_plataforma.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Imposto</p>
                      <p className="font-semibold">R$ {calculatedValues.imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Comissão Gestor</p>
                      <p className="font-semibold">R$ {calculatedValues.comissao_gestor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Comissão Copy</p>
                      <p className="font-semibold">R$ {calculatedValues.comissao_copywriter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Lucro Bruto</p>
                      <p className={`font-semibold ${calculatedValues.lucro_bruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {calculatedValues.lucro_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Lucro Líquido</p>
                      <p className={`font-semibold ${calculatedValues.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {calculatedValues.lucro_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">ROI</p>
                      <p className={`font-semibold ${calculatedValues.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {calculatedValues.roi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Ticket Médio</p>
                      <p className="font-semibold">R$ {calculatedValues.ticket_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">% Chargeback</p>
                      <p className="font-semibold">{calculatedValues.percentual_chargeback.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">% Reembolso</p>
                      <p className="font-semibold">{calculatedValues.percentual_reembolso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botões de Ação - Fixos no Bottom */}
            <div className="sticky bottom-0 bg-background border-t mt-8 p-6 -mx-6">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                
                {/* Botão Reset - apenas no modo edição */}
                {isEditMode && (
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={handleResetData}
                    disabled={saving}
                  >
                    🗑️ Resetar Dados
                  </Button>
                )}
                
                <Button 
                  className="flex-1"
                  onClick={handleSaveData}
                  disabled={saving}
                  size="lg"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditMode ? 'Atualizar' : 'Salvar'} Dados
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Financeiro Interno</h1>
              <p className="text-muted-foreground">
                Controle financeiro interno da empresa - Acesso restrito a administradores
              </p>
            </div>
            <div className="flex gap-2">
              {data?.id ? (
                <Button variant="outline" onClick={openEditModal} className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
              ) : null}
              <Button 
                onClick={openCreateModal} 
                disabled={data?.id ? true : false}
                className="flex items-center gap-2"
                variant={data?.id ? "outline" : "default"}
              >
                <Plus className="w-4 h-4" />
                {data?.id ? 'Mês já criado' : 'Adicionar Dados'}
              </Button>
            </div>
          </div>

          {/* Seletor de Mês */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Período</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecione um mês para visualizar os dados financeiros internos
                  </p>
                </div>
                <Select 
                  value={`${selectedMonth}-${selectedYear}`} 
                  onValueChange={(value) => {
                    const [month, year] = value.split('-').map(Number)
                    setSelectedMonth(month)
                    setSelectedYear(year)
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {VALID_PERIODS.map((period) => {
                      const monthName = MONTHS.find(m => m.value === period.month)?.label || 'Mês'
                      return (
                        <SelectItem key={`${period.month}-${period.year}`} value={`${period.month}-${period.year}`}>
                          {monthName} {period.year}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas do Mês - Grid Principal */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {/* Faturamento */}
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 dark:from-green-900/20 dark:to-green-800/20 dark:border-green-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Faturamento</p>
                  <p className="text-lg md:text-xl font-bold text-green-800 dark:text-green-300">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(data?.faturamento_bruto || 0)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">R$</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ROI */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">ROI</p>
                  <p className={`text-lg md:text-xl font-bold ${(data?.roi || 0) >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-red-600 dark:text-red-400'}`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatPercent(data?.roi || 0)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Médio */}
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Ticket Médio</p>
                  <p className="text-lg md:text-xl font-bold text-purple-800 dark:text-purple-300">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(data?.ticket_medio || 0)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lucro Líquido */}
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 dark:from-orange-900/20 dark:to-orange-800/20 dark:border-orange-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">Lucro Líquido</p>
                  <p className={`text-lg md:text-xl font-bold ${(data?.lucro_liquido || 0) >= 0 ? 'text-orange-800 dark:text-orange-300' : 'text-red-600 dark:text-red-400'}`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(data?.lucro_liquido || 0)}
                  </p>
                </div>
                <div className={`w-8 h-8 ${(data?.lucro_liquido || 0) >= 0 ? 'bg-orange-500' : 'bg-red-500'} rounded-full flex items-center justify-center`}>
                  {(data?.lucro_liquido || 0) >= 0 ? <TrendingUp className="w-4 h-4 text-white" /> : <TrendingDown className="w-4 h-4 text-white" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lucro Final - Card Principal */}
        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                💲 Lucro Final – {selectedMonthName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Resultado após todos os descontos e custos
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Breakdown Financeiro */}
                <div>
                  <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-200">Breakdown Financeiro</h3>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between py-2 border-b border-muted">
                          <span className="text-sm font-medium text-green-600">Faturamento</span>
                          <span className="font-mono text-green-600 font-semibold">{formatCurrency(data.faturamento_bruto)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Investimento Google Ads</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.investimento_google_ads)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Investimento Facebook</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.investimento_facebook)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Investimento TikTok</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.investimento_tiktok)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Taxa Plataforma ({formatPercent(data.taxa_plataforma_percentual)})</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.taxa_plataforma)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Imposto ({formatPercent(data.imposto_percentual)})</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.imposto)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Chargebacks</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.chargebacks)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Reembolsos</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.reembolsos)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Ferramentas</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.ferramentas)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Equipe Fixa</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.equipe_fixa)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Comissão Gestor ({formatPercent(data.gestor_trafego_percentual)} do lucro)</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.comissao_gestor_trafego)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">(-) Comissão Copy ({formatPercent(data.copywriter_percentual)} do lucro)</span>
                          <span className="font-mono text-xs text-red-500">-{formatCurrency(data.comissao_copywriter)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Resultado Final */}
                <div className="flex flex-col items-center justify-center text-center">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Lucro Líquido Final</h3>
                  <div className={`text-4xl md:text-5xl font-bold mb-2 ${
                    (data?.lucro_liquido || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {loading ? (
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                    ) : (
                      <span className={`${(data?.lucro_liquido || 0) >= 0 ? '' : '-'}`}>
                        {formatCurrency(Math.abs(data?.lucro_liquido || 0))}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    (data?.lucro_liquido || 0) >= 0 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {(data?.lucro_liquido || 0) >= 0 ? 'Lucro' : 'Prejuízo'}
                  </div>
                  
                  {/* Métricas secundárias */}
                  <div className="mt-6 grid grid-cols-2 gap-4 w-full">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">% Chargeback</p>
                      <p className="font-mono font-semibold">{formatPercent(data.faturamento_bruto > 0 ? ((data.chargebacks || 0) / data.faturamento_bruto) * 100 : 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">% Reembolso</p>
                      <p className="font-mono font-semibold">{formatPercent(data.percentual_reembolso_chargeback || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Métricas Extras */}
        {data && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/20 dark:border-indigo-800/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-1">Margem Contrib.</p>
                  <p className={`text-lg font-bold ${data.margem_contribuicao >= 0 ? 'text-indigo-800 dark:text-indigo-300' : 'text-red-600'}`}>
                    {formatCurrency(data.margem_contribuicao)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200 dark:from-amber-900/20 dark:to-amber-800/20 dark:border-amber-800/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">% Reembolso</p>
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-300">
                    {formatPercent(data.percentual_reembolso_chargeback)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/20 dark:border-emerald-800/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Vendas</p>
                  <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                    {data.numero_vendas}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminGuard>
  )
} 
