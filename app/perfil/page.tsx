"use client"
import { useEffect, useRef, useState } from "react"
import PremiumLayout from "@/components/premium-layout"
import AuthGuard from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { UploadCloud, Save, User, Phone, MapPin } from 'lucide-react'
import { PersonalInfoSection, ContactSection, AddressSection } from '@/components/profile-section'
import type { ExtendedProfile } from '@/lib/types/profile'
import { compressImage, validateImageFile } from "@/lib/image-utils"
export default function Page() {
  return (
    <PremiumLayout>
      <AuthGuard>
        <ProfileContent />
      </AuthGuard>
    </PremiumLayout>
  )
}
function normalizeRoleLabel(role: string | null | undefined) {
  const r = String(role || "").toLowerCase()
  if (r === "admin") return { label: "Administrador", color: "#FFD60A" }
  if (r === "copywriter") return { label: "Copywriter", color: "#A78BFA" }
  if (r === "gestor_trafego" || r === "gestor-de-trafego" || r === "gestor_tráfico")
    return { label: "Gestor de Tráfego", color: "#30D158" }
  if (r === "minerador") return { label: "Minerador", color: "#8E8E93" }
  return { label: "Editor", color: "#7C8CF8" }
}

// Função para extrair primeiro e segundo nome
function getDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return "Usuário"
  
  const names = fullName.trim().split(/\s+/)
  if (names.length === 1) return names[0]
  
  return `${names[0]} ${names[1]}`
}

function ProfileContent() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [me, setMeState] = useState<ExtendedProfile | null>(null)
  
  // Wrapper para rastrear todas as mudanças de estado
  const setMe = (value: ExtendedProfile | null | ((prev: ExtendedProfile | null) => ExtendedProfile | null)) => {
    const actualValue = typeof value === 'function' ? value(me) : value

    setMeState(actualValue)
  }
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const loadedRef = useRef(false) // Para evitar recarregamentos desnecessários

  useEffect(() => {
    let active = true
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 1000 // 1 segundo
    
    async function loadProfile() {
      // Se já carregamos antes E não está fazendo upload, não recarregar
      if (loadedRef.current && !avatarUploading) {

        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const supabase = await getSupabaseClient()
        const { data: u } = await supabase.auth.getUser()
        if (!u.user) {
          if (active) setLoading(false)
          return
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.user.id)
          .maybeSingle()
        if (error) throw error
        if (!active) return
        const prof = (data as ExtendedProfile) || null
        if (prof) {
          setMe(prof)
          setAvatarUrl(prof?.avatar_url || null)
          loadedRef.current = true // Marcar como carregado
          retryCount = 0 // Reset retry count on success

        }
      } catch (e: any) {

        // Verificar se é um erro temporário que justifica retry
        const isTemporaryError = 
          e?.message?.includes('Auth session missing') || 
          e?.message?.includes('JWT') ||
          e?.message?.includes('Invalid token') ||
          e?.message?.includes('network') ||
          e?.message?.includes('fetch')
        
        if (isTemporaryError && retryCount < maxRetries && active) {
          retryCount++

          setTimeout(() => {
            if (active) loadProfile()
          }, retryDelay * retryCount) // Exponential backoff
          return
        }
        
        // Só mostra o toast se for um erro real após todas as tentativas
        if (!isTemporaryError || retryCount >= maxRetries) {
          toast({
            title: "Erro ao carregar perfil",
            description: e?.message || "Falha inesperada",
            variant: "destructive",
          })
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    
    loadProfile()
    
    return () => {

      active = false
    }
  }, []) // Executar apenas uma vez na montagem do componente
  async function onPickFile() {
    fileRef.current?.click()
  }
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {

    const file = e.target.files?.[0]
    if (!file || !me) return
    
    // Validar arquivo
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast({
        title: "Arquivo inválido",
        description: validation.error,
        variant: "destructive",
      })
      return
    }
    
    // Preservar o perfil atual para evitar perda de dados
    const currentProfile = { ...me }

    setUploading(true)
    setAvatarUploading(true)

    try {
      // Comprimir imagem antes de enviar
      toast({
        title: "Processando imagem...",
        description: "Comprimindo e otimizando sua foto",
      })
      
      const compressedFile = await compressImage(file, 800, 800, 0.85)
      
      // Mostrar economia de tamanho
      const originalSize = (file.size / 1024 / 1024).toFixed(2)
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2)
      if (file.size > compressedFile.size) {
        toast({
          title: "Imagem otimizada",
          description: `Tamanho reduzido de ${originalSize}MB para ${compressedSize}MB`,
        })
      }
      
      const supabase = await getSupabaseClient()
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (!token) {
        throw new Error("Sessão expirada. Entre novamente.")
      }
      const fd = new FormData()
      fd.append("file", compressedFile, compressedFile.name)
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || "Falha no upload")
      }
      const publicUrl = payload?.url as string
      if (publicUrl) {

        setAvatarUrl(publicUrl)
        // Atualizar localmente o objeto me preservando todos os dados
        setMe({ ...currentProfile, avatar_url: publicUrl })

      }
      toast({ title: "Avatar atualizado", variant: "default" })
    } catch (e: any) {
      // Em caso de erro, garantir que o perfil original seja mantido
      if (currentProfile) {
        setMe(currentProfile)
        setAvatarUrl(currentProfile.avatar_url || null)
      }
      
      toast({
        title: "Erro ao enviar avatar",
        description: e?.message || "Falha inesperada",
        variant: "destructive",
      })
    } finally {

      setUploading(false)
      setAvatarUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleSectionSave(updates: Partial<ExtendedProfile>) {
    if (!me) {

      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      // Primeiro, fazer o UPDATE sem tentar retornar dados
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", me.id)
      
      if (updateError) {

        throw updateError
      }
      
      // Depois, buscar os dados atualizados
      const { data: updatedProfile, error: selectError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", me.id)
        .single()
      
      if (selectError) {

        throw selectError
      }
      
      if (updatedProfile) {
        // Atualizar estado local com dados atualizados
        setMe(updatedProfile as ExtendedProfile)
      }
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Dados salvos com sucesso!",
        description: "Suas informações foram atualizadas.",
        variant: "default"
      })
      
    } catch (error: any) {

      // Mostrar erro ao usuário
      toast({
        title: "Erro ao salvar dados",
        description: error?.message || "Ocorreu um erro inesperado",
        variant: "destructive"
      })
      
      // Re-throw para que o componente filho saiba que falhou
      throw error
    }
  }

  const roleMeta = normalizeRoleLabel(me?.role)
  if (loading) {
    return (
      <main className="grid gap-6">
        <Card className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E]">
          <CardContent className="p-8 text-center">
            <div className="text-white/60">Carregando perfil...</div>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!me && !loading && !avatarUploading) {

    return (
      <main className="grid gap-6">
        <Card className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E]">
          <CardContent className="p-8 text-center">
            <div className="text-white/60">Perfil não encontrado</div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      {/* Header com Avatar e Info Básica */}
      <Card className="rounded-2xl border border-[#3A3A3C] bg-[#2C2C2E]">
        <CardHeader>
          <CardTitle className="text-[#F2F2F7]">Olá, {getDisplayName(me?.full_name)}!</CardTitle>
          <CardDescription className="text-white/70">
            Gerencie todas suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-blue-500/20">
              <img
                src={avatarUrl || "/minimal-avatar.png"}
                alt="Seu avatar"
                className="h-20 w-20 object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-lg font-medium text-white">{me?.name || me?.email}</p>
                <p className="text-sm text-white/60">Membro desde {new Date(me?.created_at || '').toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Info Básica */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70 text-sm">E-mail</Label>
              <p className="text-[#F2F2F7] font-medium">{me.email}</p>
            </div>
            <div>
              <Label className="text-white/70 text-sm">Função</Label>
              <div className="mt-1">
                <Badge
                  className="rounded-full bg-transparent border"
                  style={{ borderColor: roleMeta.color, color: roleMeta.color }}
                >
                  {roleMeta.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seções Editáveis */}
      <div className="space-y-6">
        <PersonalInfoSection
          profile={me}
          onSave={(updates) => {

            return handleSectionSave(updates)
          }}
          loading={loading}
          title="Dados Pessoais"
          icon={<User className="h-5 w-5 text-blue-400" />}
        />

        <ContactSection
          profile={me}
          onSave={(updates) => {

            return handleSectionSave(updates)
          }}
          loading={loading}
          title="Contato e Financeiro"
          icon={<Phone className="h-5 w-5 text-green-400" />}
        />

        <AddressSection
          profile={me}
          onSave={(updates) => {

            return handleSectionSave(updates)
          }}
          loading={loading}
          title="Endereço"
          icon={<MapPin className="h-5 w-5 text-purple-400" />}
        />
      </div>
    </main>
  )
}
