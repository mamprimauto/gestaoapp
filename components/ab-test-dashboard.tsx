"use client"

import { useState } from 'react'
import { useSimpleABTests } from './simple-ab-provider'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Plus, Search, TrendingUp, TrendingDown, Minus, BarChart3, Play, Pause, CheckCircle, Sparkles, Clock, Users, Target, Zap, Filter, Settings } from 'lucide-react'
import ABTestForm from './ab-test-form'
import ABTestDetails from './ab-test-details'
import ABTestSettings from './ab-test-settings'
import SimpleTestMenu from './simple-test-menu'

export default function ABTestDashboard() {
  const { tests, loading, refreshTests } = useSimpleABTests()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [editingTest, setEditingTest] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'completed'>('all')

  // Filter tests
  const filteredTests = tests.filter(test => {
    const matchesSearch = searchQuery === '' || 
      test.test_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.hypothesis.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'running' && test.status === 'running') ||
      (filterStatus === 'completed' && test.status === 'completed')
    
    return matchesSearch && matchesStatus
  })

  // Stats
  const runningTests = tests.filter(t => t.status === 'running').length
  const completedTests = tests.filter(t => t.status === 'completed').length
  
  // Calculate average test duration for completed tests
  const avgDuration = completedTests > 0 ? tests.filter(t => t.status === 'completed').reduce((acc, test) => {
    const start = new Date(test.start_date).getTime()
    const end = test.end_date ? new Date(test.end_date).getTime() : new Date().getTime()
    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24))
    return acc + days
  }, 0) / completedTests : 0

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 p-4 md:p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-yellow-500" />
                Testes A/B
              </h1>
              <p className="text-sm text-gray-400 mt-1">Otimize suas conversões com dados reais</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className="border-zinc-700 text-gray-400 hover:text-white hover:border-zinc-600"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-600/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Teste
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total de Testes</p>
                  <p className="text-2xl font-bold text-white mt-1">{tests.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Em Andamento</p>
                  <p className="text-2xl font-bold text-blue-500 mt-1">{runningTests}</p>
                </div>
                <Play className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Finalizados</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">{completedTests}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Duração Média</p>
                  <p className="text-2xl font-bold text-purple-500 mt-1">
                    {avgDuration.toFixed(0)} dias
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <Input
                placeholder="Buscar teste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 backdrop-blur-sm border-zinc-800 text-white"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-white text-black' : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:text-white'}
              >
                Todos
              </Button>
              <Button
                variant={filterStatus === 'running' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('running')}
                className={filterStatus === 'running' ? 'bg-blue-600 text-white' : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:text-white'}
              >
                <Play className="h-3 w-3 mr-1" />
                Ativos
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('completed')}
                className={filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:text-white'}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Finalizados
              </Button>
            </div>
          </div>

          {/* Tests Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-gray-500 mt-4">Carregando testes...</div>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <BarChart3 className="h-16 w-16 text-gray-700" />
                <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-2 -right-2" />
              </div>
              <div className="text-gray-400 text-center">
                <p className="text-lg font-medium">
                  {searchQuery ? 'Nenhum teste encontrado' : 'Comece seu primeiro teste A/B'}
                </p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Tente outros termos de busca' : 'Clique em "Novo Teste" para começar'}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Criar Primeiro Teste
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTests.map((test) => {
                const daysSinceStart = Math.floor((new Date().getTime() - new Date(test.start_date).getTime()) / (1000 * 60 * 60 * 24))
                const daysToEnd = test.end_date ? Math.floor((new Date(test.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
                
                return (
                  <div
                    key={test.id}
                    onClick={(e) => {
                      // Não abrir modal se clicou em botões, links ou elementos interativos
                      const target = e.target as HTMLElement
                      const isInteractiveElement = target.closest('button, a, input, select, textarea') || 
                                                   target.tagName === 'BUTTON' ||
                                                   target.tagName === 'A' ||
                                                   target.closest('[role="button"]')
                      
                      if (!isInteractiveElement) {

                        setSelectedTest(test.id)
                      } else {

                      }
                    }}
                    className="group relative bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 hover:border-zinc-700 cursor-pointer transition-all hover:scale-[1.02] backdrop-blur-sm"
                  >
                    {/* Actions and Status */}
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        test.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                      }`}></div>
                      <SimpleTestMenu
                        test={test}
                        onRefresh={refreshTests}
                        onTestDeleted={(testId) => {

                          // Close details modal if the deleted test is currently open
                          if (selectedTest === testId) {

                            setSelectedTest(null)
                          }
                          
                          // Close edit modal if the deleted test is being edited
                          if (editingTest?.id === testId) {

                            setEditingTest(null)
                          }
                        }}
                      />
                    </div>

                    {/* Test Header */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                          {test.test_id}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysSinceStart}d ativo
                        </span>
                        {daysToEnd !== null && daysToEnd > 0 && (
                          <span className="text-xs text-orange-400">
                            {daysToEnd}d restantes
                          </span>
                        )}
                      </div>
                      <h3 className="text-white font-medium line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {test.hypothesis}
                      </h3>
                    </div>

                    {/* Test Info */}
                    <div className="space-y-3 mb-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-zinc-800/50 text-gray-400 px-2 py-1 rounded">
                          {test.test_type}
                        </span>
                      </div>
                      
                      {/* Comments preview */}
                      {test.comments && (
                        <div className="mt-2 p-2 bg-zinc-800/30 rounded text-xs text-gray-400 line-clamp-2">
                          {test.comments}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Floating Action Button for Mobile */}
          {filteredTests.length > 0 && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-600/30 md:hidden"
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}

          {/* Forms and Modals */}
          {showCreateForm && (
            <ABTestForm
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => {
                setShowCreateForm(false)
                refreshTests()
              }}
            />
          )}

          {editingTest && (
            <ABTestForm
              test={editingTest}
              onClose={() => setEditingTest(null)}
              onSuccess={() => {
                setEditingTest(null)
                refreshTests()
              }}
            />
          )}

          {selectedTest && (
            <ABTestDetails
              testId={selectedTest}
              onClose={() => setSelectedTest(null)}
            />
          )}

          {showSettings && (
            <ABTestSettings
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}