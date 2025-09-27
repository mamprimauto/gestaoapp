"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputMask } from '@/components/ui/input-mask'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Edit, X } from 'lucide-react'
import { formatCPF, formatPhone, formatCEP, fetchAddressByCEP, removeAllMasks } from '@/lib/masks'
import { validateCPF, validatePhone, validateCEP, validateRequired, validateMinAge, BRAZILIAN_STATES, MARITAL_STATUS_OPTIONS } from '@/lib/validations'
import { toast } from 'sonner'
import type { ExtendedProfile, ProfileSectionProps } from '@/lib/types/profile'

interface PersonalInfoSectionProps extends ProfileSectionProps {
  title: string
  icon: React.ReactNode
}

export function PersonalInfoSection({ profile, onSave, loading, title, icon }: PersonalInfoSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    birth_date: profile.birth_date || '',
    cpf: profile.cpf || '',
    rg: profile.rg || '',
    marital_status: profile.marital_status || 'solteiro',
  })

  const handleSave = async () => {
    // Validações
    if (!validateRequired(formData.full_name)) {
      toast.error('Nome completo é obrigatório')
      return
    }

    if (formData.birth_date && !validateMinAge(formData.birth_date)) {
      toast.error('Data de nascimento inválida')
      return
    }

    if (formData.cpf && !validateCPF(formData.cpf)) {
      toast.error('CPF inválido')
      return
    }

    setSaving(true)
    try {
      await onSave({
        full_name: formData.full_name,
        birth_date: formData.birth_date || null,
        cpf: formData.cpf ? removeAllMasks(formData.cpf) : null,
        rg: formData.rg || null,
        marital_status: formData.marital_status as any,
      })
      setEditing(false)
      toast.success('Dados pessoais atualizados!')
    } catch (error) {
      toast.error('Erro ao salvar dados pessoais')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: profile.full_name || '',
      birth_date: profile.birth_date || '',
      cpf: profile.cpf || '',
      rg: profile.rg || '',
      marital_status: profile.marital_status || 'solteiro',
    })
    setEditing(false)
  }

  return (
    <Card className="bg-zinc-800/50 border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle className="text-lg text-white">{title}</CardTitle>
            <CardDescription className="text-zinc-400">
              Informações pessoais e documentos
            </CardDescription>
          </div>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div>
              <Label className="text-zinc-300">Nome Completo *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Seu nome completo"
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Estado Civil</Label>
                <Select
                  value={formData.marital_status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, marital_status: value }))}
                >
                  <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">CPF</Label>
                <InputMask
                  mask="cpf"
                  value={formData.cpf}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cpf: value }))}
                  placeholder="000.000.000-00"
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Label className="text-zinc-300">RG</Label>
                <Input
                  value={formData.rg}
                  onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                  placeholder="12.345.678-9"
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
                className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 text-sm">Nome Completo</Label>
                <p className="text-white font-medium">{profile.full_name || '—'}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Data de Nascimento</Label>
                <p className="text-white">
                  {profile.birth_date 
                    ? new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') 
                    : '—'
                  }
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 text-sm">CPF</Label>
                <p className="text-white">{profile.cpf ? formatCPF(profile.cpf) : '—'}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">RG</Label>
                <p className="text-white">{profile.rg || '—'}</p>
              </div>
            </div>

            <div>
              <Label className="text-zinc-400 text-sm">Estado Civil</Label>
              <p className="text-white">
                {profile.marital_status 
                  ? MARITAL_STATUS_OPTIONS.find(o => o.value === profile.marital_status)?.label || profile.marital_status
                  : '—'
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ContactSection({ profile, onSave, loading, title, icon }: PersonalInfoSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    phone: profile.phone || '',
    pix_key: profile.pix_key || '',
  })

  const handleSave = async () => {
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error('Telefone inválido')
      return
    }

    setSaving(true)
    try {
      await onSave({
        phone: formData.phone ? removeAllMasks(formData.phone) : null,
        pix_key: formData.pix_key || null,
      })
      setEditing(false)
      toast.success('Dados de contato atualizados!')
    } catch (error) {
      toast.error('Erro ao salvar dados de contato')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      phone: profile.phone || '',
      pix_key: profile.pix_key || '',
    })
    setEditing(false)
  }

  return (
    <Card className="bg-zinc-800/50 border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle className="text-lg text-white">{title}</CardTitle>
            <CardDescription className="text-zinc-400">
              Telefone e informações de pagamento
            </CardDescription>
          </div>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div>
              <Label className="text-zinc-300">Telefone</Label>
              <InputMask
                mask="phone"
                value={formData.phone}
                onValueChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                placeholder="(11) 99999-9999"
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div>
              <Label className="text-zinc-300">Chave PIX</Label>
              <Input
                value={formData.pix_key}
                onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
                placeholder="CPF, email, telefone ou chave aleatória"
                className="mt-1 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
                className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-zinc-400 text-sm">Telefone</Label>
              <p className="text-white">{profile.phone ? formatPhone(profile.phone) : '—'}</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-sm">Chave PIX</Label>
              <p className="text-white break-all">{profile.pix_key || '—'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AddressSection({ profile, onSave, loading, title, icon }: PersonalInfoSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingCEP, setLoadingCEP] = useState(false)
  const [formData, setFormData] = useState({
    address_zipcode: profile.address_zipcode || '',
    address_street: profile.address_street || '',
    address_number: profile.address_number || '',
    address_complement: profile.address_complement || '',
    address_neighborhood: profile.address_neighborhood || '',
    address_city: profile.address_city || '',
    address_state: profile.address_state || '',
  })

  const handleCEPBlur = async () => {
    if (formData.address_zipcode && validateCEP(formData.address_zipcode)) {
      setLoadingCEP(true)
      try {
        const addressData = await fetchAddressByCEP(formData.address_zipcode)
        setFormData(prev => ({
          ...prev,
          address_street: addressData.street,
          address_neighborhood: addressData.neighborhood,
          address_city: addressData.city,
          address_state: addressData.state,
        }))
        toast.success('Endereço preenchido automaticamente!')
      } catch (error) {
        toast.error('Não foi possível buscar o endereço')
      } finally {
        setLoadingCEP(false)
      }
    }
  }

  const handleSave = async () => {
    if (formData.address_zipcode && !validateCEP(formData.address_zipcode)) {
      toast.error('CEP inválido')
      return
    }

    setSaving(true)
    try {
      await onSave({
        address_zipcode: formData.address_zipcode ? removeAllMasks(formData.address_zipcode) : null,
        address_street: formData.address_street || null,
        address_number: formData.address_number || null,
        address_complement: formData.address_complement || null,
        address_neighborhood: formData.address_neighborhood || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,
      })
      setEditing(false)
      toast.success('Endereço atualizado!')
    } catch (error) {
      toast.error('Erro ao salvar endereço')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      address_zipcode: profile.address_zipcode || '',
      address_street: profile.address_street || '',
      address_number: profile.address_number || '',
      address_complement: profile.address_complement || '',
      address_neighborhood: profile.address_neighborhood || '',
      address_city: profile.address_city || '',
      address_state: profile.address_state || '',
    })
    setEditing(false)
  }

  return (
    <Card className="bg-zinc-800/50 border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle className="text-lg text-white">{title}</CardTitle>
            <CardDescription className="text-zinc-400">
              Endereço residencial completo
            </CardDescription>
          </div>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-zinc-300">CEP</Label>
                <InputMask
                  mask="cep"
                  value={formData.address_zipcode}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, address_zipcode: value }))}
                  onBlur={handleCEPBlur}
                  placeholder="00000-000"
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
                {loadingCEP && <p className="text-blue-400 text-sm mt-1">Buscando endereço...</p>}
              </div>

              <div className="md:col-span-2">
                <Label className="text-zinc-300">Rua/Avenida</Label>
                <Input
                  value={formData.address_street}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_street: e.target.value }))}
                  placeholder="Nome da rua"
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-zinc-300">Número</Label>
                <Input
                  value={formData.address_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_number: e.target.value }))}
                  placeholder="123"
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Complemento</Label>
                <Input
                  value={formData.address_complement}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_complement: e.target.value }))}
                  placeholder="Apto, Bloco, etc."
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Bairro</Label>
                <Input
                  value={formData.address_neighborhood}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_neighborhood: e.target.value }))}
                  placeholder="Nome do bairro"
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300">Cidade</Label>
                <Input
                  value={formData.address_city}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_city: e.target.value }))}
                  placeholder="Nome da cidade"
                  className="mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Estado</Label>
                <Select
                  value={formData.address_state}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, address_state: value }))}
                >
                  <SelectTrigger className="mt-1 bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
                className="bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 text-sm">CEP</Label>
                <p className="text-white">{profile.address_zipcode ? formatCEP(profile.address_zipcode) : '—'}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Rua/Avenida</Label>
                <p className="text-white">{profile.address_street || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-zinc-400 text-sm">Número</Label>
                <p className="text-white">{profile.address_number || '—'}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Complemento</Label>
                <p className="text-white">{profile.address_complement || '—'}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Bairro</Label>
                <p className="text-white">{profile.address_neighborhood || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-400 text-sm">Cidade</Label>
                <p className="text-white">{profile.address_city || '—'}</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Estado</Label>
                <p className="text-white">
                  {profile.address_state 
                    ? BRAZILIAN_STATES.find(s => s.value === profile.address_state)?.label || profile.address_state
                    : '—'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}