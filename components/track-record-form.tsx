"use client"

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { X, Plus } from 'lucide-react'
import { useTrackRecordData } from './track-record-provider'
import { channelOptions, testTypeOptions } from '@/lib/track-record'
import type { TestType, Channel } from '@/lib/track-record'
import { toast } from 'sonner'

interface TrackRecordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Variation {
  name: string
  description: string
}

export default function TrackRecordForm({ open, onOpenChange, onSuccess }: TrackRecordFormProps) {
  const { createNewTrackRecord } = useTrackRecordData()
  const [loading, setLoading] = useState(false)
  
  // Form data
  const [hypothesis, setHypothesis] = useState('')
  const [testType, setTestType] = useState<TestType>('Creatives')
  const [channel, setChannel] = useState<Channel>('Facebook Ads')
  const [variations, setVariations] = useState<Variation[]>([
    { name: 'Controle', description: '' },
    { name: 'Variação A', description: '' }
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hypothesis.trim()) {
      toast.error('Por favor, adicione uma hipótese para o teste')
      return
    }

    if (variations.length < 2) {
      toast.error('Adicione pelo menos 2 variações')
      return
    }

    setLoading(true)
    
    try {
      await createNewTrackRecord({
        hypothesis,
        test_type: testType,
        channel,
        variations: variations.map(v => ({
          variation_name: v.name,
          variation_description: v.description
        }))
      })
      
      onSuccess()
      resetForm()
    } catch (error) {

      toast.error('Erro ao criar teste. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setHypothesis('')
    setTestType('Creatives')
    setChannel('Facebook Ads')
    setVariations([
      { name: 'Controle', description: '' },
      { name: 'Variação A', description: '' }
    ])
  }

  const addVariation = () => {
    if (variations.length >= 5) {
      toast.error('Máximo de 5 variações permitido')
      return
    }
    
    const letters = ['B', 'C', 'D', 'E']
    const nextLetter = letters[variations.length - 2] || 'B'
    setVariations([...variations, { name: `Variação ${nextLetter}`, description: '' }])
  }

  const removeVariation = (index: number) => {
    if (variations.length <= 2) return
    setVariations(variations.filter((_, i) => i !== index))
  }

  const updateVariation = (index: number, field: keyof Variation, value: string) => {
    const updated = [...variations]
    updated[index][field] = value
    setVariations(updated)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-[#1A1A1A]">
        <DialogHeader>
          <DialogTitle className="text-white">Criar Novo Teste</DialogTitle>
          <DialogDescription className="text-gray-500">
            Configure um novo teste A/B/C de forma simples e direta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hypothesis */}
          <div className="space-y-2">
            <Label className="text-gray-400">Hipótese do Teste</Label>
            <Textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Ex: Adicionar urgência no CTA vai aumentar conversões"
              className="bg-black border-[#1A1A1A] text-white placeholder:text-gray-600 min-h-[80px] resize-none"
              required
            />
          </div>

          {/* Test Type and Channel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Tipo de Teste</Label>
              <Select value={testType} onValueChange={(value) => setTestType(value as TestType)}>
                <SelectTrigger className="bg-black border-[#1A1A1A] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Canal</Label>
              <Select value={channel} onValueChange={(value) => setChannel(value as Channel)}>
                <SelectTrigger className="bg-black border-[#1A1A1A] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Variations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-gray-400">Variações</Label>
              {variations.length < 5 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addVariation}
                  className="text-gray-500 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {variations.map((variation, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={variation.name}
                    onChange={(e) => updateVariation(index, 'name', e.target.value)}
                    placeholder="Nome"
                    className="bg-black border-[#1A1A1A] text-white placeholder:text-gray-600 w-32"
                    disabled={index === 0}
                  />
                  <Input
                    value={variation.description}
                    onChange={(e) => updateVariation(index, 'description', e.target.value)}
                    placeholder="Descrição breve da variação"
                    className="bg-black border-[#1A1A1A] text-white placeholder:text-gray-600 flex-1"
                  />
                  {index > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariation(index)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#1A1A1A]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-gray-500 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-white text-black hover:bg-gray-200"
            >
              {loading ? 'Criando...' : 'Criar Teste'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}