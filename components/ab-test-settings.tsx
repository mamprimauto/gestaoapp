"use client"

import { useState, useEffect } from 'react'
import { useABTestOptions } from '@/hooks/use-ab-test-options'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { X, Plus, Edit3, Trash2, Save, Settings, Target, Megaphone, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface ABTestSettingsProps {
  onClose: () => void
}

interface EditingOption {
  id: string
  value: string
  label: string
}

export default function ABTestSettings({ onClose }: ABTestSettingsProps) {
  const { options, loading, createOption, updateOption, deleteOption, fetchOptions } = useABTestOptions()
  const [activeTab] = useState<'test_type'>('test_type')
  const [editingOption, setEditingOption] = useState<EditingOption | null>(null)
  const [newOption, setNewOption] = useState({ value: '', label: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const currentOptions = options.filter(opt => opt.option_type === activeTab)

  const handleCreate = async () => {
    if (!newOption.value.trim() || !newOption.label.trim()) return
    
    try {
      setSaving(true)
      await createOption({
        option_type: activeTab,
        value: newOption.value.trim(),
        label: newOption.label.trim()
      })
      setNewOption({ value: '', label: '' })
      setIsCreating(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string, value: string, label: string) => {
    if (!value.trim() || !label.trim()) return
    
    try {
      setSaving(true)
      await updateOption(id, { value: value.trim(), label: label.trim() })
      setEditingOption(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta opção?')) return
    
    try {
      setSaving(true)
      await deleteOption(id)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      setSaving(true)
      await updateOption(id, { is_active: !currentActive })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-gradient-x"></div>
          <div className="relative flex items-center justify-between p-6 border-b border-zinc-800/50">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="h-6 w-6 text-blue-500" />
                Configurações A/B
              </h2>
              <p className="text-sm text-gray-400 mt-1">Gerencie tipos de teste</p>
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
          {/* Only Test Types - No Tabs Needed */}

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Add New Option */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-white">
                  Adicionar Tipo de Teste
                </span>
              </div>
              
              {!isCreating ? (
                <Button
                  onClick={() => setIsCreating(true)}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-gray-400 hover:text-white hover:border-zinc-600"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Nova Opção
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">Valor (interno)</Label>
                      <Input
                        placeholder="Ex: VSL"
                        value={newOption.value}
                        onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">Rótulo (exibido)</Label>
                      <Input
                        placeholder="Ex: Video Sales Letter"
                        value={newOption.label}
                        onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreate}
                      size="sm"
                      disabled={saving || !newOption.value.trim() || !newOption.label.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {saving ? (
                        <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-2" />
                          Salvar
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCreating(false)
                        setNewOption({ value: '', label: '' })
                      }}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Options List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-400">Carregando opções...</span>
              </div>
            ) : currentOptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma opção encontrada</p>
                <p className="text-xs mt-1">Adicione a primeira opção acima</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentOptions.map((option, index) => (
                  <div
                    key={option.id}
                    className={`group relative bg-zinc-900/30 border rounded-lg p-4 transition-all ${
                      option.is_active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
                    } hover:border-zinc-700`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Drag Handle */}
                      <div className="opacity-0 group-hover:opacity-50 transition-opacity">
                        <GripVertical className="h-4 w-4 text-gray-500" />
                      </div>

                      {/* Order Number */}
                      <div className="flex-shrink-0 w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-400">{option.sort_order}</span>
                      </div>

                      {/* Option Content */}
                      <div className="flex-1">
                        {editingOption?.id === option.id ? (
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              value={editingOption.value}
                              onChange={(e) => setEditingOption({ ...editingOption, value: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-white text-sm"
                            />
                            <Input
                              value={editingOption.label}
                              onChange={(e) => setEditingOption({ ...editingOption, label: e.target.value })}
                              className="bg-zinc-800 border-zinc-700 text-white text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium">{option.label}</span>
                              <code className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                                {option.value}
                              </code>
                              {!option.is_active && (
                                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                                  Inativo
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingOption?.id === option.id ? (
                          <>
                            <Button
                              onClick={() => handleUpdate(option.id, editingOption.value, editingOption.label)}
                              size="sm"
                              variant="ghost"
                              disabled={saving}
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => setEditingOption(null)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-400 hover:bg-gray-500/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => setEditingOption({ id: option.id, value: option.value, label: option.label })}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleToggleActive(option.id, option.is_active)}
                              size="sm"
                              variant="ghost"
                              className={`h-8 w-8 p-0 ${
                                option.is_active 
                                  ? 'text-orange-500 hover:text-orange-400 hover:bg-orange-500/10' 
                                  : 'text-green-500 hover:text-green-400 hover:bg-green-500/10'
                              }`}
                            >
                              {option.is_active ? '◉' : '○'}
                            </Button>
                            <Button
                              onClick={() => handleDelete(option.id)}
                              size="sm"
                              variant="ghost"
                              disabled={saving}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}