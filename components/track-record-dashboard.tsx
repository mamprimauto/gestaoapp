"use client"

import { useState, useEffect } from 'react'
import { useTrackRecordData } from './track-record-provider'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Plus, Search, Clock } from 'lucide-react'
import TrackRecordForm from './track-record-form'
import TrackRecordDetails from './track-record-details'
import type { TrackRecord } from '@/lib/track-record'
// import PunctualityDashboard from '@/components/track-record-punctuality-component'
// import { getSupabaseClient } from '@/lib/supabase/client'

export default function TrackRecordDashboard() {
  const { trackRecords, loading, refreshTrackRecords } = useTrackRecordData()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedTrackRecord, setSelectedTrackRecord] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPunctuality, setShowPunctuality] = useState(false)
  // const [user, setUser] = useState<any>(null)

  // Get user from Supabase
  // useEffect(() => {
  //   const supabase = getSupabaseClient()
  //   supabase.auth.getUser().then(({ data }) => {
  //     setUser(data.user)
  //   })
  // }, [])

  // Use a default organization ID - this should be replaced with actual organization context
  // const organizationId = user?.user_metadata?.organization_id || 'default-org-id'

  // Filter track records based on search
  const filteredRecords = trackRecords.filter(record => {
    const query = searchQuery.toLowerCase()
    return (
      record.track_record_id.toLowerCase().includes(query) ||
      record.hypothesis?.toLowerCase().includes(query) ||
      record.channel?.toLowerCase().includes(query)
    )
  })

  const getStatusColor = (status: string) => {
    return status === 'Em andamento' ? 'text-blue-500' : 'text-green-500'
  }

  const getStatusIcon = (status: string) => {
    return status === 'Em andamento' ? '🔵' : '🟢'
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Track Record</h1>
            <p className="text-sm text-gray-500 mt-1">Gestão minimalista de testes A/B/C</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowPunctuality(!showPunctuality)}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              <Clock className="h-4 w-4 mr-2" />
              {showPunctuality ? 'Ocultar' : 'Ver'} Pontualidade
            </Button>
          </div>
        </div>

        {/* Punctuality Dashboard - Always show for testing */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Pontualidade</h2>
              <p className="text-sm text-gray-500">
                Acompanhe seu desempenho nas dailys
              </p>
            </div>
          </div>

          {/* Test content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <p className="text-sm text-gray-500">Score Geral</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-white">85</span>
                <span className="text-lg">🟢</span>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <p className="text-sm text-gray-500">Taxa de Pontualidade</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-green-500">90%</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">12 reuniões</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <p className="text-sm text-gray-500">Atraso Médio</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-white">2min atraso</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <h3 className="text-white text-lg mb-2">Copy/Gestor</h3>
              <p className="text-sm text-gray-500 mb-3">Segunda a Sexta, 14h</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Pontualidade</span>
                  <span className="font-bold text-green-500">88%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Participação</span>
                  <span className="text-white">8/10</span>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <h3 className="text-white text-lg mb-2">Editores</h3>
              <p className="text-sm text-gray-500 mb-3">Quarta-feira, 14h</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Pontualidade</span>
                  <span className="font-bold text-green-500">100%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Participação</span>
                  <span className="text-white">2/2</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 bg-[#1A1A1A] rounded p-3">
            <p><strong>Como funciona:</strong></p>
            <p>• Considera-se pontual quem chega até 5 minutos após o horário</p>
            <p>• Daily Copy/Gestor: Segunda a Sexta às 14h</p>
            <p>• Daily Editores: Quarta-feira às 14h</p>
            <p>• Dados calculados automaticamente com base na participação nas reuniões</p>
          </div>
        </div>

        {/* Original Punctuality Dashboard - Hidden for now */}
        {/* {false && showPunctuality && user && (
          <PunctualityDashboard
            userId={user.id}
            organizationId={organizationId}
            className="mb-6"
          />
        )} */}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            placeholder="Buscar teste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0A0A0A] border-[#1A1A1A] text-white placeholder:text-gray-600 h-10"
          />
        </div>

        {/* Tests List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500">Carregando...</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="text-gray-500">
              {searchQuery ? 'Nenhum teste encontrado' : 'Nenhum teste criado ainda'}
            </div>
            {!searchQuery && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-white text-black hover:bg-gray-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Teste
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <TestCard
                key={record.id}
                record={record}
                onClick={() => setSelectedTrackRecord(record.id)}
              />
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        {filteredRecords.length > 0 && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-white text-black hover:bg-gray-200 shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        {/* Create Form Modal */}
        <TrackRecordForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSuccess={() => {
            setShowCreateForm(false)
            refreshTrackRecords()
          }}
        />

        {/* Details Modal */}
        {selectedTrackRecord && (
          <TrackRecordDetails
            trackRecordId={selectedTrackRecord}
            open={!!selectedTrackRecord}
            onOpenChange={(open) => !open && setSelectedTrackRecord(null)}
            onUpdate={refreshTrackRecords}
          />
        )}
      </div>
    </div>
  )
}

// Minimalist Test Card Component
function TestCard({ record, onClick }: { record: TrackRecord; onClick: () => void }) {
  const hasWinner = record.winner_variation_id !== null
  const statusIcon = record.status === 'Em andamento' ? '🔵' : '🟢'
  
  // Get main KPIs from variations (simplified view)
  const getMainKPI = () => {
    if (!record.variations || record.variations.length === 0) return null
    
    // Find control and best performing variation
    const control = record.variations.find(v => v.variation_name === 'Controle')
    const winner = record.winner_variation_id 
      ? record.variations.find(v => v.id === record.winner_variation_id)
      : null

    if (!control || !control.kpis || control.kpis.length === 0) return null
    
    const mainKpi = control.kpis[0]
    const winnerKpi = winner?.kpis?.[0]
    
    if (!winnerKpi) return null

    const uplift = ((winnerKpi.kpi_value - mainKpi.kpi_value) / mainKpi.kpi_value) * 100
    
    return {
      control: mainKpi.kpi_value,
      winner: winnerKpi.kpi_value,
      uplift,
      kpiName: mainKpi.kpi_name,
      winnerName: winner.variation_name
    }
  }

  const kpiData = getMainKPI()

  return (
    <div
      onClick={onClick}
      className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg p-4 hover:border-[#2A2A2A] cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-500">{record.track_record_id}</span>
            <span>{statusIcon}</span>
            <span className="text-xs text-gray-600">
              {record.test_type} • {record.channel}
            </span>
            {record.status === 'Em andamento' && (
              <span className="text-xs text-gray-600">
                • {Math.floor((Date.now() - new Date(record.start_date).getTime()) / (1000 * 60 * 60 * 24))} dias
              </span>
            )}
          </div>

          {/* Title */}
          <div className="text-white font-medium">
            {record.hypothesis || 'Teste sem hipótese'}
          </div>

          {/* KPI Results (if available) */}
          {kpiData && (
            <div className="flex items-center gap-6 pt-2 border-t border-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Controle:</span>
                <span className="font-mono text-sm text-gray-400">
                  {kpiData.control.toFixed(1)}%
                </span>
              </div>
              {hasWinner && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{kpiData.winnerName}:</span>
                    <span className="font-mono text-sm text-white">
                      {kpiData.winner.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`font-mono text-sm ${kpiData.uplift > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {kpiData.uplift > 0 ? '↑' : '↓'}{Math.abs(kpiData.uplift).toFixed(0)}%
                    </span>
                    {hasWinner && <span className="text-green-500">✓</span>}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Key Learning (if finalized) */}
          {record.status === 'Finalizado' && record.insights && (
            <div className="text-xs text-gray-500 italic pt-2 border-t border-[#1A1A1A]">
              "{record.insights.substring(0, 100)}..."
            </div>
          )}
        </div>
      </div>
    </div>
  )
}