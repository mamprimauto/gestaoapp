"use client"

import { useState, useEffect } from "react"
import { X, Plus, Save, Calendar, TrendingUp, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TrackingDay {
  id?: string
  day_number: number
  ads_count: number
  date?: string
  notes?: string
}

interface SwipeFile {
  id: string
  name: string
  niche: string
  ads_count?: number
}

interface SwipeFileTrackingModalProps {
  file: SwipeFile | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

export default function SwipeFileTrackingModal({ 
  file, 
  open, 
  onClose,
  onSave 
}: SwipeFileTrackingModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [trackingDays, setTrackingDays] = useState<TrackingDay[]>([])

  useEffect(() => {
    if (open && file) {
      loadTrackingData()
    }
  }, [open, file])

  const loadTrackingData = async () => {
    if (!file) return
    
    setLoadingData(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Buscar dados de tracking existentes
      const { data, error } = await supabase
        .from("swipe_file_tracking")
        .select("*")
        .eq("swipe_file_id", file.id)
        .order("day_number", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        // Carregar dados existentes
        const existingDays = data.map(d => ({
          id: d.id,
          day_number: d.day_number,
          ads_count: d.ads_count || 0,
          date: d.date || '', // Pode ser vazio se não foi definido
          notes: d.notes
        }))
        
        existingDays.sort((a, b) => a.day_number - b.day_number)
        
        // Completar até 7 dias se necessário
        const allDays: TrackingDay[] = []
        for (let i = 0; i < 7; i++) {
          const dayNumber = i + 1
          const existingDay = existingDays.find(d => d.day_number === dayNumber)
          
          allDays.push({
            id: existingDay?.id,
            day_number: dayNumber,
            ads_count: existingDay?.ads_count || (dayNumber === 1 ? file.ads_count || 0 : 0),
            date: existingDay?.date || '', // Deixar vazio para preenchimento manual
            notes: existingDay?.notes
          })
        }
        
        console.log('✅ Dados existentes carregados:', allDays)
        setTrackingDays(allDays)
      } else {
        // Primeira vez - criar 7 dias vazios
        console.log('📝 Primeira vez - criando 7 dias para preenchimento manual')
        
        const defaultDays = Array.from({ length: 7 }, (_, i) => ({
          day_number: i + 1,
          ads_count: i === 0 ? (file.ads_count || 0) : 0, // Apenas Dia 1 com valor inicial
          date: '', // Vazio para preenchimento manual
          notes: ''
        }))
        
        console.log('✅ 7 dias vazios criados para preenchimento manual')
        setTrackingDays(defaultDays)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados de tracking:', error)
      toast.error('Erro ao carregar dados de rastreamento')
      
      // Criar dias vazios como fallback
      const defaultDays = Array.from({ length: 7 }, (_, i) => ({
        day_number: i + 1,
        ads_count: i === 0 ? (file?.ads_count || 0) : 0,
        date: '',
        notes: ''
      }))
      setTrackingDays(defaultDays)
    } finally {
      setLoadingData(false)
    }
  }

  const handleAddDay = () => {
    const newDayNumber = trackingDays.length + 1
    
    const newDay: TrackingDay = {
      day_number: newDayNumber,
      ads_count: 0,
      date: '' // Vazio para preenchimento manual
    }
    
    console.log(`🆕 Adicionando Dia ${newDayNumber} para preenchimento manual`)
    setTrackingDays([...trackingDays, newDay])
  }

  const handleUpdateDay = (index: number, field: string, value: any) => {
    const updated = [...trackingDays]
    updated[index] = { ...updated[index], [field]: value }
    setTrackingDays(updated)
  }

  const handleSave = async () => {
    if (!file) return

    // Validar se todas as datas foram preenchidas
    const missingDates = trackingDays.filter(day => !day.date)
    if (missingDates.length > 0) {
      toast.error(`Defina as datas para os dias: ${missingDates.map(d => d.day_number).join(', ')}`)
      return
    }

    setLoading(true)
    try {
      const supabase = await getSupabaseClient()

      // Primeiro, deletar registros existentes
      const { error: deleteError } = await supabase
        .from("swipe_file_tracking")
        .delete()
        .eq("swipe_file_id", file.id)
      
      if (deleteError) {
        console.error('Erro ao deletar registros existentes:', deleteError)
      }

      // Preparar dados para inserir
      const dataToInsert = trackingDays.map(day => ({
        swipe_file_id: file.id,
        day_number: day.day_number,
        ads_count: day.ads_count || 0,
        date: day.date || null,
        notes: day.notes || null
      }))

      // Inserir novos dados
      const { data: insertData, error: upsertError } = await supabase
        .from("swipe_file_tracking")
        .insert(dataToInsert)
        .select()

      if (upsertError) {
        console.error('Erro ao inserir dados:', upsertError)
        throw upsertError
      }

      // Atualizar flag is_tracking na biblioteca
      const { error: updateError } = await supabase
        .from("swipe_files")
        .update({ is_tracking: true })
        .eq("id", file.id)

      if (updateError) {
        console.error('Erro ao atualizar flag:', updateError)
        throw updateError
      }

      toast.success("Rastreamento salvo com sucesso!")
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      toast.error(`Erro ao salvar: ${error.message || "Erro desconhecido"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Rastreamento Manual de Resultados
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Defina manualmente as datas e quantidade de anúncios para cada dia
          </DialogDescription>
        </DialogHeader>

        {file && (
          <div className="space-y-6">
            {/* Info da biblioteca */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">Biblioteca</h3>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-sm text-gray-400">{file.niche}</p>
            </div>

            {/* Lista de dias */}
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {trackingDays.map((day, index) => (
                    <div
                      key={`day-${day.day_number}`}
                      className="bg-gray-800/30 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-500/20 rounded-lg p-2">
                            <Calendar className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <Label className="text-white font-medium">
                              Dia {day.day_number}
                            </Label>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm text-gray-400">Data</Label>
                          <Input
                            type="date"
                            value={day.date || ''}
                            onChange={(e) => handleUpdateDay(index, 'date', e.target.value)}
                            className="mt-1 bg-gray-800 border-gray-700 text-white"
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div>
                          <Label className="text-sm text-gray-400">Qtd. Anúncios</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              min="0"
                              value={day.ads_count}
                              onChange={(e) => handleUpdateDay(index, 'ads_count', parseInt(e.target.value) || 0)}
                              className="bg-gray-800 border-gray-700 text-white text-center"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão adicionar dia */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDay}
                    className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Dia {trackingDays.length + 1}
                  </Button>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <div className="text-sm text-yellow-400">
                💡 Defina manualmente a data de cada dia de rastreamento
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || loadingData}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Salvar Rastreamento
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}