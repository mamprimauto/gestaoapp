"use client"

import { useState, useEffect } from 'react'
import { useSimpleABTests } from './simple-ab-provider'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { X, TrendingUp, TrendingDown, BarChart3, Trophy, AlertCircle } from 'lucide-react'
import { calculateSignificance, calculateImprovement, formatMetricValue } from '@/lib/ab-tests'
import type { Metric } from '@/lib/ab-tests'

interface ABTestMetricsProps {
  testId: string
  onClose: () => void
}

export default function ABTestMetrics({ testId, onClose }: ABTestMetricsProps) {
  const { tests, variants, metrics, updateMetric, updateTest } = useSimpleABTests()
  const [editingMetrics, setEditingMetrics] = useState<Record<string, Partial<Metric>>>({})
  
  const test = tests.find(t => t.id === testId)
  const testVariants = variants[testId] || []
  const [selectedMetric, setSelectedMetric] = useState<Metric['metric_type']>('CTR')

  if (!test) return null

  // Get or create metrics for each variant
  const getVariantMetrics = (variantId: string) => {
    return metrics[variantId] || []
  }

  // Calculate winner based on selected metric
  const calculateWinner = () => {
    if (testVariants.length < 2) return null

    const control = testVariants.find(v => v.is_control)
    if (!control) return null

    const controlMetrics = getVariantMetrics(control.id)
    const controlMetric = controlMetrics.find(m => m.metric_type === selectedMetric)
    
    if (!controlMetric) return null

    let bestVariant = control
    let bestImprovement = 0
    let isSignificant = false

    testVariants.forEach(variant => {
      if (variant.id === control.id) return
      
      const variantMetrics = getVariantMetrics(variant.id)
      const variantMetric = variantMetrics.find(m => m.metric_type === selectedMetric)
      
      if (variantMetric) {
        const improvement = calculateImprovement(controlMetric.value, variantMetric.value)
        const significance = calculateSignificance(controlMetric, variantMetric, test.confidence_level)
        
        if (improvement > bestImprovement && significance.isSignificant) {
          bestVariant = variant
          bestImprovement = improvement
          isSignificant = true
        }
      }
    })

    return isSignificant ? { variant: bestVariant, improvement: bestImprovement } : null
  }

  const winner = calculateWinner()

  // Handle metric update
  const handleMetricUpdate = async (variantId: string, metricType: Metric['metric_type']) => {
    const value = editingMetrics[`${variantId}-${metricType}`]
    if (!value) return

    await updateMetric(variantId, {
      metric_type: metricType,
      value: parseFloat(value.value?.toString() || '0'),
      unit: metricType === 'CPC' || metricType === 'CPA' || metricType === 'CPM' ? '$' : 
            metricType === 'Conversions' ? 'count' : '%',
      sample_size: parseInt(value.sample_size?.toString() || '1000')
    })

    setEditingMetrics({})
  }

  // Declare winner - simplified for now
  const handleDeclareWinner = async () => {
    if (!winner) return
    
    try {
      // Mark the winning variant as winner
      await updateTest(testId, { 
        status: 'completed',
        winner_variant: winner.variant.name,
        completion_date: new Date().toISOString()
      })
      
      // Close modal and refresh data
      onClose()
    } catch (error) {
      // Error handling already implemented in updateTest
    }
  }

  const metricTypes: Metric['metric_type'][] = ['CTR', 'CPC', 'CPA', 'ROAS', 'CVR', 'CPM', 'Conversions']

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Métricas do Teste</h2>
              <span className="text-xs font-mono text-gray-500">{test.test_id}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{test.hypothesis}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metric Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {metricTypes.map(type => (
              <Button
                key={type}
                variant={selectedMetric === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric(type)}
                className={selectedMetric === type ? 'bg-white text-black' : 'border-zinc-700 text-gray-400'}
              >
                {type}
              </Button>
            ))}
          </div>

          {/* Winner Alert */}
          {winner && test.status === 'running' && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-green-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-green-400 font-medium">Vencedor Estatístico Detectado!</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Variante {winner.variant.name} está performando {winner.improvement.toFixed(1)}% melhor que o controle
                    com {test.confidence_level}% de confiança.
                  </p>
                  <Button
                    onClick={handleDeclareWinner}
                    size="sm"
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Declarar Vencedor e Finalizar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* No Data Alert */}
          {testVariants.length === 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-yellow-400 font-medium">Configuração Necessária</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Adicione variantes ao teste antes de inserir métricas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Variants Table */}
          <div className="space-y-4">
            {testVariants.map(variant => {
              const variantMetrics = getVariantMetrics(variant.id)
              const metric = variantMetrics.find(m => m.metric_type === selectedMetric)
              const editKey = `${variant.id}-${selectedMetric}`
              const isEditing = editKey in editingMetrics

              return (
                <div
                  key={variant.id}
                  className={`border rounded-lg p-4 ${
                    variant.is_winner ? 'border-green-800 bg-green-900/10' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-medium text-white">
                          Variante {variant.name}
                        </span>
                        {variant.is_control && (
                          <span className="text-xs bg-zinc-800 text-gray-400 px-2 py-0.5 rounded">
                            Controle
                          </span>
                        )}
                        {variant.is_winner && (
                          <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                            Vencedor
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{variant.description}</p>
                    </div>
                  </div>

                  {/* Metric Input/Display */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Valor</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={editingMetrics[editKey]?.value || ''}
                          onChange={(e) => setEditingMetrics({
                            ...editingMetrics,
                            [editKey]: { ...editingMetrics[editKey], value: parseFloat(e.target.value) }
                          })}
                          className="bg-zinc-800 border-zinc-700 text-white mt-1"
                        />
                      ) : (
                        <div className="text-xl font-mono text-white mt-1">
                          {metric ? formatMetricValue(
                            metric.value,
                            metric.unit
                          ) : '-'}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500">Amostra</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          placeholder="1000"
                          value={editingMetrics[editKey]?.sample_size || ''}
                          onChange={(e) => setEditingMetrics({
                            ...editingMetrics,
                            [editKey]: { ...editingMetrics[editKey], sample_size: parseInt(e.target.value) }
                          })}
                          className="bg-zinc-800 border-zinc-700 text-white mt-1"
                        />
                      ) : (
                        <div className="text-xl font-mono text-white mt-1">
                          {metric?.sample_size?.toLocaleString() || '-'}
                        </div>
                      )}
                    </div>

                    <div className="flex items-end">
                      {isEditing ? (
                        <div className="flex gap-2 w-full">
                          <Button
                            size="sm"
                            onClick={() => handleMetricUpdate(variant.id, selectedMetric)}
                            className="flex-1 bg-white text-black hover:bg-gray-200"
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingMetrics({})}
                            className="border-zinc-700 text-gray-400"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingMetrics({
                            [editKey]: {
                              value: metric?.value || 0,
                              sample_size: metric?.sample_size || 1000
                            }
                          })}
                          className="w-full border-zinc-700 text-gray-400"
                        >
                          {metric ? 'Editar' : 'Adicionar'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Performance vs Control */}
                  {!variant.is_control && metric && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      {(() => {
                        const controlVariant = testVariants.find(v => v.is_control)
                        if (!controlVariant) return null
                        
                        const controlMetrics = getVariantMetrics(controlVariant.id)
                        const controlMetric = controlMetrics.find(m => m.metric_type === selectedMetric)
                        
                        if (!controlMetric) return null
                        
                        const improvement = calculateImprovement(controlMetric.value, metric.value)
                        const significance = calculateSignificance(controlMetric, metric, test.confidence_level)
                        
                        return (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">vs Controle</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                {improvement > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                <span className={improvement > 0 ? 'text-green-500' : 'text-red-500'}>
                                  {improvement > 0 && '+'}{improvement.toFixed(1)}%
                                </span>
                              </div>
                              {significance.isSignificant && (
                                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                                  Significante
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}