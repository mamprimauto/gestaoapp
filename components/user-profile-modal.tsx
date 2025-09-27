"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield,
  CreditCard,
  FileText,
  Home,
  Heart,
  Cake,
  Hash
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Profile {
  id: string
  name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
  phone: string | null
  full_name: string | null
  birth_date: string | null
  cpf: string | null
  rg: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zipcode: string | null
  pix_key: string | null
  marital_status: string | null
  created_at: string
  approved: boolean | null
}

interface UserProfileModalProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin?: boolean
  currentUserId?: string
}

export default function UserProfileModal({
  userId,
  open,
  onOpenChange,
}: UserProfileModalProps) {
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Carregar dados do perfil
  useEffect(() => {
    if (open && userId) {
      loadProfile()
    }
  }, [open, userId])
  
  async function loadProfile() {
    if (!userId) return
    
    setLoading(true)
    try {
      // Usar API route que contorna RLS para pegar dados completos
      const response = await fetch(`/api/profiles/${userId}/full`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao carregar perfil')
      }
      
      const data = await response.json()

      setProfile(data)
    } catch (error: any) {

      toast({
        title: "Erro ao carregar perfil",
        description: error.message || "Não foi possível carregar os dados do perfil",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  function getRoleBadge(role: string | null) {
    const roleColors = {
      admin: "bg-red-900/20 text-red-400 border-red-800/50",
      editor: "bg-blue-900/20 text-blue-400 border-blue-800/50",
      copy: "bg-green-900/20 text-green-400 border-green-800/50",
      copywriter: "bg-green-900/20 text-green-400 border-green-800/50",
      user: "bg-gray-900/20 text-gray-400 border-gray-800/50"
    }
    
    const roleLabels = {
      admin: "Administrador",
      editor: "Editor",
      copy: "Copywriter",
      copywriter: "Copywriter",
      user: "Usuário"
    }
    
    const normalizedRole = role?.toLowerCase() || "user"
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${roleColors[normalizedRole as keyof typeof roleColors] || roleColors.user}`}>
        <Shield className="h-3 w-3" />
        {roleLabels[normalizedRole as keyof typeof roleLabels] || "Usuário"}
      </span>
    )
  }
  
  function formatCPF(cpf: string | null) {
    if (!cpf) return "Não informado"
    // Remove non-digits
    const digits = cpf.replace(/\D/g, '')
    // Format as XXX.XXX.XXX-XX
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  
  function formatPhone(phone: string | null) {
    if (!phone) return "Não informado"
    // Remove non-digits
    const digits = phone.replace(/\D/g, '')
    // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
    if (digits.length === 11) {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }
  
  function formatZipCode(zip: string | null) {
    if (!zip) return ""
    // Remove non-digits
    const digits = zip.replace(/\D/g, '')
    // Format as XXXXX-XXX
    return digits.replace(/(\d{5})(\d{3})/, '$1-$2')
  }
  
  function getMaritalStatus(status: string | null) {
    const statusLabels = {
      solteiro: "Solteiro(a)",
      casado: "Casado(a)",
      divorciado: "Divorciado(a)",
      viuvo: "Viúvo(a)",
      uniao_estavel: "União Estável"
    }
    return statusLabels[status as keyof typeof statusLabels] || "Não informado"
  }
  
  function formatAddress(profile: Profile) {
    if (!profile.address_street) return "Não informado"
    
    let address = profile.address_street
    if (profile.address_number) address += `, ${profile.address_number}`
    if (profile.address_complement) address += ` - ${profile.address_complement}`
    if (profile.address_neighborhood) address += `, ${profile.address_neighborhood}`
    if (profile.address_city && profile.address_state) {
      address += ` - ${profile.address_city}/${profile.address_state}`
    }
    if (profile.address_zipcode) address += ` - CEP: ${formatZipCode(profile.address_zipcode)}`
    
    return address
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1C] border-[#3A3A3C] text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Dados do Usuário
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-white/60">Carregando...</div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header com Avatar e Info Básica */}
            <div className="flex items-start gap-4 pb-4 border-b border-[#3A3A3C]">
              <Avatar className="h-20 w-20 border-2 border-[#3A3A3C]">
                <AvatarImage src={profile.avatar_url || "/minimal-avatar.png"} />
                <AvatarFallback className="bg-[#3A3A3C] text-white text-2xl">
                  {(profile.name?.[0] || profile.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  {profile.full_name || profile.name || "Sem nome"}
                </h2>
                
                <div className="flex items-center gap-3">
                  <span className="text-white/60">{profile.email}</span>
                  {getRoleBadge(profile.role)}
                </div>
                
                <div className="text-sm text-white/60">
                  Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
            
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CPF */}
                {profile.cpf && (
                  <div className="space-y-1">
                    <Label className="text-xs text-white/60 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      CPF
                    </Label>
                    <p className="text-white font-mono">{formatCPF(profile.cpf)}</p>
                  </div>
                )}
                
                {/* RG */}
                {profile.rg && (
                  <div className="space-y-1">
                    <Label className="text-xs text-white/60 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      RG
                    </Label>
                    <p className="text-white font-mono">{profile.rg}</p>
                  </div>
                )}
                
                {/* Data de Nascimento */}
                {profile.birth_date && (
                  <div className="space-y-1">
                    <Label className="text-xs text-white/60 flex items-center gap-1">
                      <Cake className="h-3 w-3" />
                      Data de Nascimento
                    </Label>
                    <p className="text-white">
                      {new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                
                {/* Estado Civil */}
                {profile.marital_status && (
                  <div className="space-y-1">
                    <Label className="text-xs text-white/60 flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      Estado Civil
                    </Label>
                    <p className="text-white">{getMaritalStatus(profile.marital_status)}</p>
                  </div>
                )}
                
                {/* Telefone */}
                {profile.phone && (
                  <div className="space-y-1">
                    <Label className="text-xs text-white/60 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Telefone
                    </Label>
                    <p className="text-white">{formatPhone(profile.phone)}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Endereço */}
            {profile.address_street && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Endereço
                </h3>
                
                <div className="space-y-1">
                  <Label className="text-xs text-white/60 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Endereço Completo
                  </Label>
                  <p className="text-white">{formatAddress(profile)}</p>
                </div>
              </div>
            )}
            
            {/* Dados Financeiros */}
            {profile.pix_key && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Dados Financeiros
                </h3>
                
                <div className="space-y-1">
                  <Label className="text-xs text-white/60 flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Chave PIX
                  </Label>
                  <p className="text-white font-mono bg-[#2A2A2C] px-3 py-2 rounded-md">
                    {profile.pix_key}
                  </p>
                </div>
              </div>
            )}
            
            {/* Mensagem se não há dados cadastrados */}
            {!profile.cpf && !profile.phone && !profile.address_street && !profile.pix_key && (
              <div className="text-center py-8 text-white/60">
                <p>Este usuário ainda não completou o cadastro com informações adicionais.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-white/60">Perfil não encontrado</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}