"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  PiggyBank,
  Plus,
  Info,
  Loader2,
  Edit,
  Trash2,
  Settings,
  Users
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { 
  FinancialDataWithRelations,
  CreateFinancialDataDTO,
  CreateFinancialToolDTO,
  CreateFinancialEmployeeDTO,
  FinancialTool,
  FinancialEmployee,
  MONTHS
} from "@/lib/financeiro/types"
import { 
  transformToAshboardData,
  formatCurrency,
  formatPercent
} from "@/lib/financeiro/calculations"

export default function FinanceiroDashboard() {
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [supabase, setSupabase] = useState<any>(null)
  const router = useRouter()
  
  // Estados
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const currentMonth = new Date().getMonth() + 1
    return currentMonth >= 8 ? currentMonth : 8
  })
  const [selectedYear] = useState(new Date().getFullYear())
  const [showAddDataModal, setShowAddDataModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [financialData, setFinancialData] = useState<FinancialDataWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Tools and employees management states
  const [showToolModal, setShowToolModal] = useState(false)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [isEditingTool, setIsEditingTool] = useState(false)
  const [isEditingEmployee, setIsEditingEmployee] = useState(false)
  const [editingToolId, setEditingToolId] = useState<string | null>(null)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{type: 'tool' | 'employee', id: string, name: string} | null>(null)
  const [toolFormData, setToolFormData] = useState({
    name: '',
    cost: 0,
    category: 'software' as 'software' | 'hardware' | 'service' | 'other',
    description: ''
  })
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    role: '',
    salary: 0,
    department: 'geral' as 'editor' | 'copywriter' | 'gestor_trafego' | 'minerador' | 'admin' | 'geral',
    employment_type: 'clt' as 'clt' | 'pj' | 'freelancer'
  })
  
  // Form states
  const [formData, setFormData] = useState({
    revenue: 0,
    facebook_investment: 0,
    google_investment: 0,
    tax_percentage: 10.0,
    return_amount: 0,
    profit_percentage: 15.0
  })

  // Inicializar cliente Supabase
  useEffect(() => {
    const client = getSupabaseClient()
    setSupabase(client)
  }, [])

  // Redirecionar se não logado
  useEffect(() => {
    if (authLoading) return // Wait for auth to load
    
    if (!user) {

      router.push('/login')
      return
    }
  }, [user, authLoading, router])

  // Carregar dados financeiros
  useEffect(() => {
    if (authLoading || !user || !supabase) return
    loadFinancialData()
  }, [supabase, selectedMonth, selectedYear, user, authLoading])

  const loadFinancialData = async () => {
    if (!supabase || !user) return

    try {
      setLoading(true)
      
      // Use simple fetch with credentials
      const response = await fetch(
        `/api/financeiro/data?month=${selectedMonth}&year=${selectedYear}&include_tools=true&include_employees=true`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (response.ok) {
        const result = await response.json()
        setFinancialData(result.data)
      } else if (response.status === 401) {
        // Session expired - redirect to login
        toast({
          title: "Sessão Expirada",
          description: "Sua sessão expirou. Faça login novamente.",
          variant: "destructive"
        })
        router.push('/login')
        return
      } else if (response.status === 404) {
        // No data found - this is normal
        setFinancialData(null)
      } else {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        toast({
          title: "Erro",
          description: error.error || "Falha ao carregar dados financeiros",
          variant: "destructive"
        })
        setFinancialData(null)
      }
    } catch (error: any) {

      toast({
        title: "Erro",
        description: "Falha ao conectar com o servidor",
        variant: "destructive"
      })
      setFinancialData(null)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setIsEditMode(false)
    setFormData({
      revenue: 0,
      facebook_investment: 0,
      google_investment: 0,
      tax_percentage: 0.0,
      return_amount: 0,
      profit_percentage: 15.0
    })
    setShowAddDataModal(true)
  }

  const openEditModal = () => {
    if (!financialData) return
    
    setIsEditMode(true)
    setFormData({
      revenue: financialData.revenue,
      facebook_investment: financialData.facebook_investment,
      google_investment: financialData.google_investment,
      tax_percentage: financialData.tax_percentage,
      return_amount: financialData.return_amount,
      profit_percentage: financialData.profit_percentage
    })
    setShowAddDataModal(true)
  }

  const handleSaveData = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para salvar dados.",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      const dataToSave = {
        month: selectedMonth,
        year: selectedYear,
        revenue: formData.revenue,
        facebook_investment: formData.facebook_investment,
        google_investment: formData.google_investment,
        tax_percentage: formData.tax_percentage,
        return_amount: formData.return_amount,
        profit_percentage: formData.profit_percentage,
        ...(isEditMode && financialData ? { id: financialData.id } : {})
      }
      
      // Use simple fetch with credentials
      const response = await fetch('/api/financeiro/data', {
        method: isEditMode ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      })
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: isEditMode ? "Dados financeiros atualizados com sucesso!" : "Dados financeiros salvos com sucesso!"
        })
        setShowAddDataModal(false)
        setIsEditMode(false)
        loadFinancialData()
        
        // Reset form
        setFormData({
          revenue: 0,
          facebook_investment: 0,
          google_investment: 0,
          tax_percentage: 0.0,
          return_amount: 0,
          profit_percentage: 15.0
        })
      } else if (response.status === 401) {
        toast({
          title: "Sessão Expirada",
          description: "Sua sessão expirou. Faça login novamente.",
          variant: "destructive"
        })
        router.push('/login')
        return
      } else if (response.status === 404) {
        const error = await response.json()
        toast({
          title: "Organização Necessária",
          description: error.details || "Você precisa estar vinculado a uma organização para usar o sistema financeiro.",
          variant: "destructive"
        })
        return
      } else {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        toast({
          title: "Erro",
          description: error.error || "Falha ao salvar dados",
          variant: "destructive"
        })
      }
    } catch (error: any) {

      toast({
        title: "Erro",
        description: "Falha ao conectar com o servidor",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Tools management functions
  const openToolCreateModal = () => {
    setIsEditingTool(false)
    setEditingToolId(null)
    setToolFormData({ name: '', cost: 0, category: 'software', description: '' })
    setShowToolModal(true)
  }

  const openToolEditModal = (tool: FinancialTool) => {
    setIsEditingTool(true)
    setEditingToolId(tool.id)
    setToolFormData({
      name: tool.name,
      cost: tool.cost,
      category: tool.category,
      description: tool.description || ''
    })
    setShowToolModal(true)
  }

  const confirmDeleteTool = (tool: FinancialTool) => {
    setItemToDelete({ type: 'tool', id: tool.id, name: tool.name })
    setShowDeleteConfirm(true)
  }

  const handleSaveTool = async () => {
    if (!financialData) return
    
    try {
      setSaving(true)
      
      const toolData = isEditingTool ? {
        id: editingToolId,
        name: toolFormData.name,
        cost: toolFormData.cost,
        category: toolFormData.category,
        description: toolFormData.description
      } : {
        financial_data_id: financialData.id,
        name: toolFormData.name,
        cost: toolFormData.cost,
        category: toolFormData.category,
        description: toolFormData.description
      }
      
      const response = await fetch('/api/financeiro/tools', {
        method: isEditingTool ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      })
      
      if (response.ok) {
        toast({ 
          title: "Sucesso", 
          description: isEditingTool ? "Ferramenta atualizada com sucesso!" : "Ferramenta adicionada com sucesso!" 
        })
        setShowToolModal(false)
        setIsEditingTool(false)
        setEditingToolId(null)
        setToolFormData({ name: '', cost: 0, category: 'software', description: '' })
        loadFinancialData()
      } else {
        const error = await response.json()
        toast({ 
          title: "Erro", 
          description: error.error || `Falha ao ${isEditingTool ? 'atualizar' : 'adicionar'} ferramenta`, 
          variant: "destructive" 
        })
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao conectar com o servidor", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Employee management functions  
  const openEmployeeCreateModal = () => {
    setIsEditingEmployee(false)
    setEditingEmployeeId(null)
    setEmployeeFormData({ name: '', role: '', salary: 0, department: 'geral', employment_type: 'clt' })
    setShowEmployeeModal(true)
  }

  const openEmployeeEditModal = (employee: FinancialEmployee) => {
    setIsEditingEmployee(true)
    setEditingEmployeeId(employee.id)
    setEmployeeFormData({
      name: employee.name,
      role: employee.role,
      salary: employee.salary,
      department: employee.department,
      employment_type: employee.employment_type
    })
    setShowEmployeeModal(true)
  }

  const confirmDeleteEmployee = (employee: FinancialEmployee) => {
    setItemToDelete({ type: 'employee', id: employee.id, name: employee.name })
    setShowDeleteConfirm(true)
  }

  const handleSaveEmployee = async () => {
    if (!financialData) return
    
    try {
      setSaving(true)
      
      const employeeData = isEditingEmployee ? {
        id: editingEmployeeId,
        name: employeeFormData.name,
        role: employeeFormData.role,
        salary: employeeFormData.salary,
        department: employeeFormData.department,
        employment_type: employeeFormData.employment_type
      } : {
        financial_data_id: financialData.id,
        name: employeeFormData.name,
        role: employeeFormData.role,
        salary: employeeFormData.salary,
        department: employeeFormData.department,
        employment_type: employeeFormData.employment_type
      }
      
      const response = await fetch('/api/financeiro/employees', {
        method: isEditingEmployee ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      })
      
      if (response.ok) {
        toast({ 
          title: "Sucesso", 
          description: isEditingEmployee ? "Colaborador atualizado com sucesso!" : "Colaborador adicionado com sucesso!" 
        })
        setShowEmployeeModal(false)
        setIsEditingEmployee(false)
        setEditingEmployeeId(null)
        setEmployeeFormData({ name: '', role: '', salary: 0, department: 'geral', employment_type: 'clt' })
        loadFinancialData()
      } else {
        const error = await response.json()
        toast({ 
          title: "Erro", 
          description: error.error || `Falha ao ${isEditingEmployee ? 'atualizar' : 'adicionar'} colaborador`, 
          variant: "destructive" 
        })
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao conectar com o servidor", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Delete function for both tools and employees
  const handleDeleteItem = async () => {
    if (!itemToDelete) return
    
    try {
      setSaving(true)
      const endpoint = itemToDelete.type === 'tool' ? '/api/financeiro/tools' : '/api/financeiro/employees'
      
      const response = await fetch(`${endpoint}?id=${itemToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (response.ok) {
        toast({ 
          title: "Sucesso", 
          description: `${itemToDelete.type === 'tool' ? 'Ferramenta' : 'Colaborador'} excluído com sucesso!` 
        })
        setShowDeleteConfirm(false)
        setItemToDelete(null)
        loadFinancialData()
      } else {
        const error = await response.json()
        toast({ 
          title: "Erro", 
          description: error.error || "Falha ao excluir", 
          variant: "destructive" 
        })
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao conectar com o servidor", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }
  
  // Transformar dados para o dashboard
  const currentData = financialData ? transformToAshboardData(financialData) : null
  const selectedMonthName = MONTHS.find(m => m.value === selectedMonth)?.label || 'Mês'

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho das suas campanhas de marketing digital
            </p>
          </div>
          <div className="flex gap-2">
            {financialData && (
              <Button variant="outline" onClick={openEditModal} className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Editar Mês
              </Button>
            )}
            <Dialog open={showAddDataModal} onOpenChange={setShowAddDataModal}>
              <DialogTrigger asChild>
                <Button 
                  onClick={openCreateModal} 
                  disabled={financialData !== null}
                  className="flex items-center gap-2"
                  variant={financialData ? "outline" : "default"}
                >
                  <Plus className="w-4 h-4" />
                  {financialData ? 'Mês já criado' : 'Adicionar Dados'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditMode ? 'Editar Dados Financeiros' : 'Adicionar Dados Financeiros'}</DialogTitle>
                  <DialogDescription>
                    {isEditMode 
                      ? 'Edite os campos abaixo para atualizar os dados financeiros.'
                      : 'Preencha os campos abaixo para adicionar dados financeiros do mês selecionado.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="faturamento">Faturamento</Label>
                    <Input 
                      id="faturamento" 
                      type="number"
                      placeholder="0"
                      value={formData.revenue}
                      onChange={(e) => setFormData(prev => ({...prev, revenue: Number(e.target.value)}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebook">Investimento Facebook</Label>
                    <Input 
                      id="facebook" 
                      type="number"
                      placeholder="0"
                      value={formData.facebook_investment}
                      onChange={(e) => setFormData(prev => ({...prev, facebook_investment: Number(e.target.value)}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="google">Investimento Google</Label>
                    <Input 
                      id="google" 
                      type="number"
                      placeholder="0"
                      value={formData.google_investment}
                      onChange={(e) => setFormData(prev => ({...prev, google_investment: Number(e.target.value)}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax">% Imposto</Label>
                    <Input 
                      id="tax" 
                      type="number"
                      placeholder="10"
                      step="0.1"
                      value={formData.tax_percentage}
                      onChange={(e) => setFormData(prev => ({...prev, tax_percentage: Number(e.target.value)}))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="returns">Devoluções (R$)</Label>
                    <Input 
                      id="returns" 
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={formData.return_amount}
                      onChange={(e) => setFormData(prev => ({...prev, return_amount: Number(e.target.value)}))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowAddDataModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSaveData}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar Dados
                  </Button>
                </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Card de seleção de mês */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Métricas do Mês</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione um mês para visualizar as métricas detalhadas
                </p>
              </div>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Faturamento */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    formatCurrency(currentData?.faturamento || 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{selectedMonthName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Margem de Lucro */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Margem de Lucro Líquido</p>
                <p className={`text-2xl font-bold ${(currentData?.margemLucro || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    formatPercent(currentData?.margemLucro || 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{selectedMonthName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Devoluções */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Devoluções</p>
                <p className="text-2xl font-bold text-orange-500">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    formatCurrency(currentData?.devolucoes || 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{selectedMonthName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meu Lucro */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Meu Lucro</p>
                <p className={`text-2xl font-bold ${(currentData?.meuLucro || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    formatCurrency(currentData?.meuLucro || 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{selectedMonthName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Principal - Lucro Final */}
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
              <h3 className="font-semibold mb-4">Breakdown Financeiro</h3>
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : currentData?.breakdown ? (
                  currentData.breakdown.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group cursor-help"
                      title={item.descricao}
                    >
                      <span className={`font-medium ${
                        item.tipo === 'receita' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {item.nome}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono">
                          {formatCurrency(item.valor)}
                        </span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {formatPercent(item.percentual)}
                        </span>
                        <Info className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum dado financeiro encontrado para este mês</p>
                    <p className="text-sm mt-1">Clique em "Adicionar Dados" para inserir informações</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lucro Final */}
            <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/20 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Lucro Líquido Final</h3>
              <div className={`text-4xl md:text-5xl font-bold mb-2 ${
                (currentData?.lucroLiquido || 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  formatCurrency(currentData?.lucroLiquido || 0)
                )}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                (currentData?.lucroLiquido || 0) >= 0 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {(currentData?.lucroLiquido || 0) >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Lucro
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    Prejuízo
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Inferiores */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Custos por Ferramentas */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Custos por Ferramentas – {selectedMonthName}</CardTitle>
              {financialData && (
                <Dialog open={showToolModal} onOpenChange={setShowToolModal}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={openToolCreateModal} 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{isEditingTool ? 'Editar Ferramenta' : 'Adicionar Ferramenta'}</DialogTitle>
                      <DialogDescription>
                        {isEditingTool 
                          ? 'Edite os dados da ferramenta ou software.'
                          : 'Adicione uma nova ferramenta ou software aos custos mensais.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tool-name">Nome da Ferramenta</Label>
                        <Input
                          id="tool-name"
                          value={toolFormData.name}
                          onChange={(e) => setToolFormData(prev => ({...prev, name: e.target.value}))}
                          placeholder="Ex: Adobe Creative Suite"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tool-cost">Custo Mensal (R$)</Label>
                        <Input
                          id="tool-cost"
                          type="number"
                          step="0.01"
                          value={toolFormData.cost}
                          onChange={(e) => setToolFormData(prev => ({...prev, cost: Number(e.target.value)}))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tool-description">Descrição (opcional)</Label>
                        <Input
                          id="tool-description"
                          value={toolFormData.description}
                          onChange={(e) => setToolFormData(prev => ({...prev, description: e.target.value}))}
                          placeholder="Breve descrição da ferramenta"
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setShowToolModal(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={handleSaveTool}
                          disabled={saving || !toolFormData.name || toolFormData.cost <= 0}
                        >
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : financialData?.tools && financialData.tools.length > 0 ? (
                financialData.tools.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-medium text-sm">{tool.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {formatCurrency(tool.cost)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openToolEditModal(tool)}
                        className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteTool(tool)}
                        className="h-7 w-7 p-0 opacity-60 hover:opacity-100 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhuma ferramenta cadastrada</p>
                  {financialData && (
                    <p className="text-xs mt-1">Clique no botão "+" para adicionar</p>
                  )}
                </div>
              )}
            </div>
            <div className="border-t pt-3 mt-4 flex justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Total Ferramentas</div>
                <div className="font-mono font-semibold text-lg">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    formatCurrency(currentData?.totalFerramentas || 0)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custos Fixos por Colaborador */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Custos Fixos por Colaborador – {selectedMonthName}</CardTitle>
              {financialData && (
                <Dialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={openEmployeeCreateModal} 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{isEditingEmployee ? 'Editar Colaborador' : 'Adicionar Colaborador'}</DialogTitle>
                      <DialogDescription>
                        {isEditingEmployee
                          ? 'Edite os dados do colaborador.'
                          : 'Adicione um novo colaborador aos custos fixos mensais.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="emp-name">Nome</Label>
                          <Input
                            id="emp-name"
                            value={employeeFormData.name}
                            onChange={(e) => setEmployeeFormData(prev => ({...prev, name: e.target.value}))}
                            placeholder="Nome do colaborador"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emp-role">Função</Label>
                          <Input
                            id="emp-role"
                            value={employeeFormData.role}
                            onChange={(e) => setEmployeeFormData(prev => ({...prev, role: e.target.value}))}
                            placeholder="Ex: Designer, Editor, etc."
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="emp-salary">Salário Mensal (R$)</Label>
                        <Input
                          id="emp-salary"
                          type="number"
                          step="0.01"
                          value={employeeFormData.salary}
                          onChange={(e) => setEmployeeFormData(prev => ({...prev, salary: Number(e.target.value)}))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emp-dept">Departamento</Label>
                        <Select value={employeeFormData.department} onValueChange={(value: any) => setEmployeeFormData(prev => ({...prev, department: value}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="copywriter">Copywriter</SelectItem>
                            <SelectItem value="gestor_trafego">Gestor de Tráfego</SelectItem>
                            <SelectItem value="minerador">Minerador</SelectItem>
                            <SelectItem value="admin">Administrativo</SelectItem>
                            <SelectItem value="geral">Geral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setShowEmployeeModal(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={handleSaveEmployee}
                          disabled={saving || !employeeFormData.name || !employeeFormData.role || employeeFormData.salary <= 0}
                        >
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : financialData?.employees && financialData.employees.length > 0 ? (
                financialData.employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{employee.name}</span>
                        <span className="text-xs text-muted-foreground">{employee.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {formatCurrency(employee.salary)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEmployeeEditModal(employee)}
                        className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteEmployee(employee)}
                        className="h-7 w-7 p-0 opacity-60 hover:opacity-100 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhum colaborador cadastrado</p>
                  {financialData && (
                    <p className="text-xs mt-1">Clique no botão "+" para adicionar</p>
                  )}
                </div>
              )}
            </div>
            <div className="border-t pt-3 mt-4 flex justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Total Colaboradores</div>
                <div className="font-mono font-semibold text-lg">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    formatCurrency(currentData?.totalColaboradores || 0)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {itemToDelete?.type === 'tool' ? 'a ferramenta' : 'o colaborador'} "{itemToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setShowDeleteConfirm(false)
                setItemToDelete(null)
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteItem}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}