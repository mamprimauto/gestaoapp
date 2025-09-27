"use client"

import { useState, useEffect } from 'react'
import { useSimpleABTests } from './simple-ab-provider'
import { useABTestOptions } from '@/hooks/use-ab-test-options'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { X, Plus, Trash2, Sparkles, Video, FileText, Code, Edit3, Zap } from 'lucide-react'
import type { SimpleABTest as ABTest, SimpleVariant as Variant } from '@/lib/simple-ab-tests'
import { toast } from 'sonner'

interface ABTestFormProps {
  testId?: string
  onClose: () => void
  onSuccess: () => void
}

const templates = [
  {
    id: 'vsl',
    name: 'Teste de VSL',
    icon: Video,
    color: 'from-purple-600 to-pink-600',
    hypothesis: 'Testar nova VSL com hook mais impactante nos primeiros 30 segundos',
    test_type: 'VSL' as ABTest['test_type'],
    variants: [
      { name: 'A', description: 'VSL original com depoimentos', is_control: true },
      { name: 'B', description: 'VSL com promessa no início', is_control: false }
    ]
  },
  {
    id: 'lead',
    name: 'Teste de Lead',
    icon: Zap,
    color: 'from-blue-600 to-cyan-600',
    hypothesis: 'Simplificar formulário de captura aumentará conversão em 25%',
    test_type: 'Landing Page' as ABTest['test_type'],
    variants: [
      { name: 'A', description: 'Formulário com 5 campos', is_control: true },
      { name: 'B', description: 'Formulário com apenas email', is_control: false }
    ]
  },
  {
    id: 'headline',
    name: 'Teste de Headline',
    icon: Edit3,
    color: 'from-green-600 to-teal-600',
    hypothesis: 'Headline com números específicos converterá 20% melhor',
    test_type: 'Headline' as ABTest['test_type'],
    variants: [
      { name: 'A', description: 'Headline genérica com benefício', is_control: true },
      { name: 'B', description: 'Headline com número específico', is_control: false }
    ]
  },
  {
    id: 'html',
    name: 'Teste de HTML',
    icon: Code,
    color: 'from-orange-600 to-red-600',
    hypothesis: 'Layout com elementos interativos aumentará engajamento',
    test_type: 'Landing Page' as ABTest['test_type'],
    variants: [
      { name: 'A', description: 'Layout estático tradicional', is_control: true },
      { name: 'B', description: 'Layout com animações e interações', is_control: false }
    ]
  },
  {
    id: 'custom',
    name: 'Outro',
    icon: Sparkles,
    color: 'from-gray-600 to-gray-700',
    hypothesis: '',
    test_type: 'Creative' as ABTest['test_type'],
    variants: [
      { name: 'A', description: '', is_control: true },
      { name: 'B', description: '', is_control: false }
    ]
  }
]

export default function ABTestForm({ testId, onClose, onSuccess }: ABTestFormProps) {
  const { createTest } = useSimpleABTests()
  const { getTestTypes } = useABTestOptions()
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    hypothesis: '',
    test_type: 'Landing Page' as ABTest['test_type'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    comments: ''
  })

  const testTypes = getTestTypes()

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData({
        hypothesis: template.hypothesis,
        test_type: template.test_type,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        comments: ''
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createTest({
        hypothesis: formData.hypothesis,
        test_type: formData.test_type,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        comments: formData.comments,
        status: 'running'
      })

      onSuccess()
    } catch (error: any) {
      let errorMessage = 'Erro ao criar teste.'
      
      if (error.message?.includes('not authenticated')) {
        errorMessage = 'Você precisa estar logado para criar um teste.'
      } else if (error.message?.includes('organization')) {
        errorMessage = 'Erro ao configurar workspace. Tente novamente.'
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/50 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-gradient-x"></div>
          <div className="relative flex items-center justify-between p-6 border-b border-zinc-800/50">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {testId ? 'Editar Teste' : 'Novo Teste A/B'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">Escolha um template ou crie do zero</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Template Selection */}
          {!selectedTemplate && (
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const Icon = template.icon
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:scale-105"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                      <Icon className="h-8 w-8 text-gray-400 group-hover:text-white mb-3 transition-colors" />
                      <h3 className="font-semibold text-white group-hover:text-white transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.id === 'custom' ? 'Configure manualmente' : 'Template pronto'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Form */}
          {selectedTemplate && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Back to templates */}
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                ← Voltar para templates
              </button>

              {/* Hypothesis */}
              <div className="space-y-2">
                <Label htmlFor="hypothesis" className="text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Hipótese
                </Label>
                <Textarea
                  id="hypothesis"
                  placeholder="Ex: Mudar o CTA de 'Saiba Mais' para 'Começar Agora' aumentará a conversão em 15%"
                  value={formData.hypothesis}
                  onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-white min-h-[100px] focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Test Type */}
              <div className="space-y-2">
                <Label htmlFor="test_type" className="text-white">Tipo de Teste</Label>
                <Select
                  value={formData.test_type}
                  onValueChange={(value) => setFormData({ ...formData, test_type: value as ABTest['test_type'] })}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {testTypes.map((type) => (
                      <SelectItem key={type.id} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-white">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-white focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date" className="text-white">Data de Fim (opcional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <Label htmlFor="comments" className="text-white">Comentários Iniciais (opcional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Adicione observações, contexto ou objetivos específicos..."
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="bg-zinc-900 border-zinc-800 text-white min-h-[80px] focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-zinc-700 text-gray-400 hover:text-white hover:border-zinc-600"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.hypothesis}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-semibold px-6"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Criando...
                    </div>
                  ) : (
                    'Criar Teste'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}