"use client"

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Trophy, Loader2, Save, X, Plus, CheckCircle } from 'lucide-react'
import { useTrackRecordData } from './track-record-provider'
import { kpiOptions, updateVariationKPIs, setWinnerVariation } from '@/lib/track-record'
import type { TrackRecord, TrackRecordVariation, TrackRecordKPI, KPIName } from '@/lib/track-record'
import { toast } from 'sonner'

interface TrackRecordDetailsProps {
  trackRecordId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export default function TrackRecordDetails({ trackRecordId, open, onOpenChange, onUpdate }: TrackRecordDetailsProps) {
  const { getTrackRecordDetails, updateExistingTrackRecord } = useTrackRecordData()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trackRecord, setTrackRecord] = useState<TrackRecord | null>(null)
  const [variations, setVariations] = useState<TrackRecordVariation[]>([])
  const [kpis, setKpis] = useState<{ [variationId: string]: TrackRecordKPI[] }>({})
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false)
  const [insights, setInsights] = useState('')
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [editingKpis, setEditingKpis] = useState<{ [variationId: string]: { [kpiName: string]: number } }>({})

  useEffect(() => {
    if (open && trackRecordId) {
      loadTrackRecordDetails()
    }
  }, [open, trackRecordId])

  const loadTrackRecordDetails = async () => {
    setLoading(true)
    try {
      const details = await getTrackRecordDetails(trackRecordId)
      if (details) {
        setTrackRecord(details.trackRecord)
        setVariations(details.variations)
        setKpis(details.kpis)
        setInsights(details.trackRecord.insights || '')
        setSelectedWinner(details.trackRecord.winner_variation_id)
        
        // Initialize KPI edit values
        const kpiValues: { [variationId: string]: { [kpiName: string]: number } } = {}
        details.variations.forEach(v => {
          kpiValues[v.id] = {}
          if (details.kpis[v.id]) {
            details.kpis[v.id].forEach(kpi => {
              kpiValues[v.id][kpi.kpi_name] = kpi.kpi_value
            })
          }
        })
        setEditingKpis(kpiValues)
      }
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!trackRecord) return
    
    setSaving(true)
    try {
      // Update insights
      if (insights !== trackRecord.insights) {
        await updateExistingTrackRecord(trackRecord.id, { insights })
      }

      // Update KPIs for each variation
      for (const variation of variations) {
        const variationKpis = editingKpis[variation.id]
        if (variationKpis) {
          const kpiList = Object.entries(variationKpis)
            .filter(([_, value]) => value !== null && value !== undefined)
            .map(([name, value]) => ({
              kpi_name: name as KPIName,
              kpi_value: Number(value)
            }))
          
          if (kpiList.length > 0) {
            await updateVariationKPIs(variation.id, kpiList)
          }
        }
      }

      // Update winner if changed
      if (selectedWinner !== trackRecord.winner_variation_id) {
        await setWinnerVariation(trackRecord.id, selectedWinner)
      }

      // Finalize test if winner is selected and test is ongoing
      if (selectedWinner && trackRecord.status === 'Em andamento') {
        await updateExistingTrackRecord(trackRecord.id, { 
          status: 'Finalizado',
          winner_variation_id: selectedWinner
        })
      }

      await loadTrackRecordDetails()
      onUpdate()
      setEditMode(false)
    } catch (error) {

      toast.error('Erro ao salvar alterações')
    } finally {
      setSaving(false)
    }
  }

  const handleKpiChange = (variationId: string, kpiName: string, value: string) => {
    setEditingKpis(prev => ({
      ...prev,
      [variationId]: {
        ...prev[variationId],
        [kpiName]: value === '' ? 0 : Number(value)
      }
    }))
  }

  const getKpiValue = (variationId: string, kpiName: string) => {
    return editingKpis[variationId]?.[kpiName] ?? 0
  }

  const calculateUplift = (control: number, variation: number) => {
    if (control === 0) return 0
    return ((variation - control) / control) * 100
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden bg-[#0A0A0A] border-[#1A1A1A]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : !trackRecord ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500">Teste não encontrado</span>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-3">
                <span className="font-mono">{trackRecord.track_record_id}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  trackRecord.status === 'Em andamento' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {trackRecord.status}
                </span>
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                {trackRecord.test_type} • {trackRecord.channel} • 
                {new Date(trackRecord.start_date).toLocaleDateString('pt-BR')}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[calc(90vh-180px)] space-y-6 py-4">
              {/* Hypothesis */}
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-wider">Hipótese</Label>
                <p className="text-white mt-1">{trackRecord.hypothesis}</p>
              </div>

              {/* Variations & KPIs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-400 text-xs uppercase tracking-wider">Resultados</Label>
                  {!editMode && trackRecord.status === 'Em andamento' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditMode(true)}
                      className="text-gray-500 hover:text-white h-7"
                    >
                      Adicionar KPIs
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {variations.map((variation, index) => {
                    const isControl = index === 0
                    const controlKpi = variations[0] && kpis[variations[0].id]?.[0]
                    const variationKpi = kpis[variation.id]?.[0]
                    const uplift = controlKpi && variationKpi && !isControl
                      ? calculateUplift(controlKpi.kpi_value, variationKpi.kpi_value)
                      : 0

                    return (
                      <div 
                        key={variation.id} 
                        className={`border rounded-lg p-3 ${
                          selectedWinner === variation.id 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : 'border-[#1A1A1A]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {variation.variation_name}
                              </span>
                              {selectedWinner === variation.id && (
                                <Trophy className="h-4 w-4 text-green-500" />
                              )}
                              {!isControl && uplift !== 0 && !editMode && (
                                <span className={`text-xs font-mono ${
                                  uplift > 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {uplift > 0 ? '↑' : '↓'}{Math.abs(uplift).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            {variation.variation_description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {variation.variation_description}
                              </p>
                            )}
                          </div>

                          {/* KPI Display/Edit */}
                          <div className="flex items-center gap-2">
                            {editMode ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={getKpiValue(variation.id, 'CVR')}
                                  onChange={(e) => handleKpiChange(variation.id, 'CVR', e.target.value)}
                                  className="w-20 h-8 bg-black border-[#1A1A1A] text-white text-sm"
                                  placeholder="0.00"
                                />
                                <span className="text-gray-500 text-sm">%</span>
                              </div>
                            ) : (
                              variationKpi && (
                                <div className="text-right">
                                  <div className="font-mono text-white">
                                    {variationKpi.kpi_value.toFixed(2)}%
                                  </div>
                                  <div className="text-xs text-gray-500">CVR</div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Winner Selection (Edit Mode) */}
              {editMode && (
                <div>
                  <Label className="text-gray-400 text-xs uppercase tracking-wider mb-3 block">
                    Selecionar Vencedor
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {variations.map(variation => (
                      <Button
                        key={variation.id}
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedWinner(variation.id)}
                        className={`justify-start ${
                          selectedWinner === variation.id
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-black border border-[#1A1A1A] text-gray-400 hover:text-white'
                        }`}
                      >
                        {selectedWinner === variation.id && (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        {variation.variation_name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-wider">
                  Aprendizados
                </Label>
                {editMode ? (
                  <Textarea
                    value={insights}
                    onChange={(e) => setInsights(e.target.value)}
                    placeholder="Descreva os principais aprendizados deste teste..."
                    className="mt-2 bg-black border-[#1A1A1A] text-white placeholder:text-gray-600 min-h-[100px] resize-none"
                  />
                ) : (
                  <p className="text-white mt-1">
                    {insights || <span className="text-gray-500 italic">Nenhum aprendizado documentado</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#1A1A1A]">
              {editMode ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditMode(false)
                      loadTrackRecordDetails()
                    }}
                    className="text-gray-500 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-white text-black hover:bg-gray-200"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {trackRecord.status === 'Em andamento' && (
                    <Button
                      variant="ghost"
                      onClick={() => setEditMode(true)}
                      className="text-gray-500 hover:text-white"
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="text-gray-500 hover:text-white"
                  >
                    Fechar
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}