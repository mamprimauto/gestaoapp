"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSimpleABTests } from './simple-ab-provider'
import { useABTestOptions } from '@/hooks/use-ab-test-options'
import { useToast } from '@/hooks/use-toast'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { X, Calendar, MessageSquare, Play, CheckCircle, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import ABTestComments from './ab-test-comments'
import type { SimpleABTest } from '@/lib/simple-ab-tests'
import { toast } from 'sonner'

interface ABTestDetailsProps {
  testId: string
  onClose: () => void
}

export default function ABTestDetails({ testId, onClose }: ABTestDetailsProps) {
  const { tests, updateTest } = useSimpleABTests()
  const { getTestTypes, getChannels } = useABTestOptions()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<SimpleABTest>>({})
  const [commentsCount, setCommentsCount] = useState(0)

  const test = tests.find(t => t.id === testId)
  const testTypes = getTestTypes()
  const channels = getChannels()

  const loadCommentsCount = useCallback(async (testId: string) => {

    // Se não temos o teste na lista local, não tentar carregar comentários
    if (!tests.find(t => t.id === testId)) {

      setCommentsCount(0)
      onClose()
      return
    }
    
    try {
      const supabase = await getSupabaseClient()
      const { data: refreshData } = await supabase.auth.refreshSession()
      const session = refreshData.session || (await supabase.auth.getSession()).data.session
      if (!session?.access_token) {

        setCommentsCount(0)
        return
      }

      const res = await fetch(`/api/ab-tests/${testId}/comments`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      
      // If test was deleted (404), just set count to 0 and close modal silently
      if (res.status === 404) {

        setCommentsCount(0)
        setTimeout(() => onClose(), 100)
        return
      }
      
      const data = await res.json()
      if (res.ok && data.comments) {

        setCommentsCount(data.comments.length)
      } else {
        setCommentsCount(0)
      }
    } catch (error) {

      setCommentsCount(0)
    }
  }, [tests, onClose])

  const handleFieldChange = useCallback((field: keyof SimpleABTest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!test) return
    
    try {
      setSaving(true)
      await updateTest(test.id, {
        hypothesis: formData.hypothesis,
        test_type: formData.test_type,
        channel: formData.channel,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        comments: formData.comments
      })
      onClose()
    } catch (error) {
      toast.error('Erro ao salvar alterações')
    } finally {
      setSaving(false)
    }
  }, [test, formData, updateTest, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"
      if (isSave) {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleSave])

  useEffect(() => {

    let isMounted = true
    
    if (test && isMounted) {
      const initialData = {
        hypothesis: test.hypothesis,
        test_type: test.test_type,
        channel: test.channel,
        status: test.status,
        start_date: test.start_date,
        end_date: test.end_date || '',
        comments: test.comments || ''
      }
      setFormData(initialData)
      
      // Só carregar comentários se o componente ainda estiver montado
      if (isMounted) {
        loadCommentsCount(test.id)
      }
    } else if (testId && tests.length > 0 && !test) {
      // Se não encontrou o teste mas já carregamos a lista de testes, fecha o modal

      onClose()
    }
    
    return () => {
      isMounted = false
    }
  }, [test, testId, tests.length]) // Dependências simplificadas

  if (!test) {
    return null
  }

  const daysSinceStart = Math.floor((new Date().getTime() - new Date(test.start_date).getTime()) / (1000 * 60 * 60 * 24))
  const daysToEnd = test.end_date ? Math.floor((new Date(test.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/50 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
          <div className="relative flex items-center justify-between p-6 border-b border-zinc-800/50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                  {test.test_id}
                </span>
                <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                  test.status === 'running' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {test.status === 'running' ? (
                    <>
                      <Play className="h-3 w-3" />
                      Em Andamento
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Finalizado
                    </>
                  )}
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">Detalhes do Teste</h2>
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {daysSinceStart}d ativo
                </span>
                {daysToEnd !== null && daysToEnd > 0 && (
                  <span>• {daysToEnd}d restantes</span>
                )}
                {commentsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {commentsCount} comentário{commentsCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-600">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 min-h-full">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-white font-medium text-sm">Hipótese</Label>
                  <Textarea
                    placeholder="Descreva sua hipótese..."
                    value={formData.hypothesis || ''}
                    onChange={(e) => handleFieldChange('hypothesis', e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-white min-h-[80px] focus:border-blue-500 transition-colors text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-medium text-sm">Tipo de Teste</Label>
                  <Select
                    value={formData.test_type || ''}
                    onValueChange={(value) => handleFieldChange('test_type', value)}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors h-9 text-sm">
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white font-medium text-sm">Data de Início</Label>
                    <Input
                      type="date"
                      value={formData.start_date || ''}
                      onChange={(e) => handleFieldChange('start_date', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white focus:border-blue-500 transition-colors h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white font-medium text-sm">Data de Fim (opcional)</Label>
                    <Input
                      type="date"
                      value={formData.end_date || ''}
                      onChange={(e) => handleFieldChange('end_date', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white focus:border-blue-500 transition-colors h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-medium text-sm">Status</Label>
                  <Select
                    value={formData.status || ''}
                    onValueChange={(value) => handleFieldChange('status', value)}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700 transition-colors h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="running">Em Andamento</SelectItem>
                      <SelectItem value="completed">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="lg:border-l lg:border-zinc-800 lg:pl-3 border-t border-zinc-800 pt-3 lg:border-t-0 lg:pt-0 space-y-3">
                {/* Comentários */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-white/70" />
                      <span className="text-sm font-medium text-white/90">Comentários</span>
                      {commentsCount > 0 && (
                        <span className="text-xs text-white/50">({commentsCount})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-h-[400px] max-h-[500px] p-4">
                    <ABTestComments 
                      testId={test.id}
                      onCommentChange={() => {
                        loadCommentsCount(test.id)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="shrink-0 px-3 lg:px-4 py-3 border-t border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-black">
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-9 px-3 text-white/80 hover:bg-white/5 rounded-md"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white hover:bg-blue-700 rounded-md h-9 px-4"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}