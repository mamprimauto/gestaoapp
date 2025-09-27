// 🔐 Página do Vault - Interface Segura para Gerenciamento de Senhas
// Zero-Knowledge Architecture com máxima segurança

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  Search, 
  Plus, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Copy, 
  Edit, 
  Trash2,
  Star,
  StarOff,
  Shield,
  KeyRound,
  Globe,
  CreditCard,
  FileText,
  User,
  Building,
  Bitcoin,
  MoreVertical,
  Filter,
  SortDesc,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Image,
  Upload,
  X,
  ExternalLink
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { useVaultCrypto } from '@/lib/vault/crypto'
import { 
  VaultItemDisplay, 
  VaultItemForm, 
  VaultCategory, 
  VAULT_CATEGORIES,
  PasswordStrength,
  VaultVisibilityLevel,
  VAULT_VISIBILITY_LEVELS,
  UserDepartment,
  USER_DEPARTMENTS,
  TeamRole,
  UserProfile,
  getVaultPermissions
} from '@/lib/vault/types'
import { getSupabaseClient } from '@/lib/supabase/client'

// ===== COMPONENTE PRINCIPAL =====

export default function VaultPage() {
  const { toast } = useToast()
  const [crypto, setCrypto] = useState<ReturnType<typeof useVaultCrypto>>(null)

  // Estados principais
  const [isUnlocked, setIsUnlocked] = useState(true) // Sempre desbloqueado
  const [masterPassword, setMasterPassword] = useState('777') // Senha padrão automática
  const [items, setItems] = useState<VaultItemDisplay[]>([])
  const [loading, setLoading] = useState(false)
  const [userIP, setUserIP] = useState<string>('Detectando...')
  const [lastActivity, setLastActivity] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [activeTab, setActiveTab] = useState('passwords')

  // Estados do modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<VaultItemDisplay | null>(null)
  const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false) // Estado para controlar o collapse das permissões

  // Estados de formulário
  const [formData, setFormData] = useState<VaultItemForm>({
    title: '',
    url: '',
    username: '',
    password: '',
    notes: '',
    category: 'login',
    favorite: false,
    images: [],
    visibility_level: 'custom', // Sempre usar custom para o sistema de checkboxes
    allowed_departments: [], // Array vazio = apenas criador + admin
    shared_with_managers: false,
    shared_with_admins: false
  })
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [lightboxImage, setLightboxImage] = useState<{url: string; name: string} | null>(null)
  
  const [uploading, setUploading] = useState(false)
  
  // Estado do perfil e permissões do usuário
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // ===== FUNÇÕES DE PERMISSÕES =====

  const loadUserProfile = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      // Usar getUser() igual ao /equipe em vez de getSession()
      const { data: userData } = await supabase.auth.getUser()
      
      if (!userData.user) {

        return
      }

      // Buscar perfil do usuário na tabela profiles (igual ao /equipe)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle()

      // Se não encontrou o perfil, usar fallback
      let finalProfile = profile
      if (error || !profile) {

        // Determinar role baseado no email
        let defaultRole = 'editor'
        if (userData.user.email === 'igorzimpel@gmail.com') {
          defaultRole = 'admin'
        }
        
        // Usar fallback local (não tenta criar no banco)
        finalProfile = {
          id: userData.user.id,
          name: userData.user.email?.split('@')[0] || 'Usuário',
          email: userData.user.email || '',
          role: defaultRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Mostrar alerta para o usuário executar o SQL
        toast({
          title: '⚠️ Perfil não encontrado',
          description: 'Execute o script FIX_PROFILES_RLS_COMPLETE.sql no Supabase SQL Editor para configurar seu perfil.',
          variant: 'default'
        })
      }

      // Validar o role - sem modificar case pois o banco já armazena corretamente
      const validRoles: TeamRole[] = ['admin', 'editor', 'copywriter', 'gestor_trafego', 'minerador']

      // Usar o role como está
      let finalRole: TeamRole = finalProfile.role as TeamRole
      
      // Se o role não for válido, usar um fallback apropriado (não admin!)
      if (!finalProfile.role || !validRoles.includes(finalProfile.role as TeamRole)) {

        finalRole = 'editor' // Fallback seguro - não dar admin por padrão!
      }

      const validatedProfile: UserProfile = {
        ...finalProfile,
        role: finalRole
      }

      setUserProfile(validatedProfile)

    } catch (error) {

    }
  }, [toast])

  // ===== HELPER FUNCTIONS PARA PERMISSÕES =====
  
  const getUserVaultPermissions = useCallback(() => {
    if (!userProfile) {
      return null
    }
    
    const permissions = getVaultPermissions(userProfile.role as TeamRole)
    return permissions
  }, [userProfile])

  const canUserCreateShared = useCallback(() => {
    const permissions = getUserVaultPermissions()
    return permissions?.can_create_shared || false
  }, [getUserVaultPermissions])

  const canUserAccessCrossDepartment = useCallback(() => {
    const permissions = getUserVaultPermissions()
    return permissions?.can_access_cross_department || false
  }, [getUserVaultPermissions])

  const isUserAdmin = useCallback(() => {
    const permissions = getUserVaultPermissions()
    return permissions?.access_level === 'admin'
  }, [getUserVaultPermissions])

  const getUserDepartment = useCallback(() => {
    const permissions = getUserVaultPermissions()
    return permissions?.department || 'particular'
  }, [getUserVaultPermissions])

  // ===== FUNÇÕES DE PERSISTÊNCIA DE SESSÃO =====

  const saveVaultSession = useCallback((password: string) => {
    // Criar token de sessão temporário (válido por 30 minutos)
    const sessionData = {
      unlocked: true,
      timestamp: Date.now(),
      hash: btoa(password) // Base64 simples para não expor senha diretamente
    }
    sessionStorage.setItem('vault_session', JSON.stringify(sessionData))
  }, [])

  const loadVaultSession = useCallback(() => {
    try {
      const stored = sessionStorage.getItem('vault_session')
      if (!stored) return null

      const sessionData = JSON.parse(stored)
      const now = Date.now()
      const thirtyMinutes = 30 * 60 * 1000

      // Verificar se a sessão não expirou
      if (now - sessionData.timestamp > thirtyMinutes) {
        sessionStorage.removeItem('vault_session')
        return null
      }

      return sessionData
    } catch {
      sessionStorage.removeItem('vault_session')
      return null
    }
  }, [])

  const clearVaultSession = useCallback(() => {
    sessionStorage.removeItem('vault_session')
  }, [])

  // ===== FUNÇÕES DE CRIPTOGRAFIA =====

  const unlockVault = useCallback(async (password: string = '777', showSuccessToast: boolean = true) => {
    // Sem validação de senha - sempre usa '777' internamente
    
    setLoading(true)
    try {
      // Buscar dados do vault
      const supabase = await getSupabaseClient()
      const { data: authData } = await supabase.auth.getSession()
      
      if (!authData.session) {
        throw new Error('Sessão não encontrada')
      }

      const response = await fetch('/api/vault/items', {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar vault')
      }

      const { data: vaultItems } = await response.json()

      setMasterPassword(password)
      setIsUnlocked(true)
      setItems(vaultItems || [])
      
      // Salvar sessão do vault
      saveVaultSession(password)
      
      // Carregar perfil do usuário após unlock
      await loadUserProfile()
      
      // Mostrar toast apenas se solicitado (login manual)
      if (showSuccessToast) {
        toast({ 
          title: 'Vault Desbloqueado', 
          description: 'Acesso autorizado com sucesso' 
        })
      }
      
      return true
    } catch (error) {

      toast({ 
        title: 'Erro', 
        description: 'Falha ao desbloquear o vault',
        variant: 'destructive' 
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [crypto, toast, saveVaultSession, loadUserProfile])

  const lockVault = useCallback(() => {
    setIsUnlocked(false)
    setMasterPassword('')
    setItems([])
    setUserProfile(null)
    setFormData({
      title: '',
      url: '',
      username: '',
      password: '',
      notes: '',
      category: 'login',
      favorite: false,
      images: [],
      visibility_level: 'custom',
      allowed_departments: [],
      shared_with_managers: false,
      shared_with_admins: false
    })

    setSelectedImages([])
    setImagePreviews([])
    setShowAddModal(false)
    setShowEditModal(false)
    setEditingItem(null)
    
    // Limpar sessão salva
    clearVaultSession()
    
    toast({ 
      title: 'Vault Bloqueado', 
      description: 'Sua sessão foi encerrada com segurança' 
    })
  }, [toast, clearVaultSession])

  // Função para lidar com upload de imagem
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Validar cada arquivo
    const validFiles: File[] = []
    const newPreviews: string[] = []
    
    for (const file of files) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: `Arquivo ${file.name} não é uma imagem`,
          variant: 'destructive'
        })
        continue
      }

      // Validar tamanho (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: `Imagem ${file.name} deve ter no máximo 5MB`,
          variant: 'destructive'
        })
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    // Adicionar às imagens selecionadas
    setSelectedImages(prev => [...prev, ...validFiles])
    
    // Criar previews para as novas imagens
    validFiles.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        setImagePreviews(prev => [...prev, dataUrl])
      }
      reader.readAsDataURL(file)
    })

    // Reset do input para permitir selecionar o mesmo arquivo novamente
    event.target.value = ''
  }, [toast])

  // Função para upload da imagem usando Signed URLs (padrão que funciona)
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      const supabase = await getSupabaseClient()
      
      // Obter token de autenticação
      const { data: sessionData } = await supabase.auth.getSession()
      const jwt = sessionData.session?.access_token
      if (!jwt) {
        throw new Error('Sessão expirada, faça login novamente')
      }

      // Step 1: Obter URL assinada
      const signRes = await fetch('/api/vault/images/sign-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          size: file.size,
          contentType: file.type
        }),
      })

      if (!signRes.ok) {
        const errorData = await signRes.json()
        throw new Error(errorData.error || 'Erro ao preparar upload')
      }

      const { signedUrl, path } = await signRes.json()

      // Step 2: Upload usando URL assinada
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`)
      }

      // Step 3: Obter URL público
      const { data } = supabase.storage
        .from('vault-images')
        .getPublicUrl(path)

      return data.publicUrl
    } catch (error) {

      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao fazer upload da imagem',
        variant: 'destructive'
      })
      return null
    } finally {
      setUploading(false)
    }
  }, [toast])

  // Função para upload de múltiplas imagens
  const uploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadImage(file))
    const results = await Promise.all(uploadPromises)
    return results.filter((url): url is string => url !== null)
  }, [uploadImage])

  // Função para remover imagem por índice
  const removeImage = useCallback((index: number) => {

    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Função para remover todas as imagens (existentes e novas)
  const clearImages = useCallback(() => {

    setSelectedImages([])
    setImagePreviews([])
    setFormData(prev => ({ ...prev, images: [] }))
  }, [])

  // ===== FUNÇÕES DE GERENCIAMENTO DE ITENS =====

  const saveItem = useCallback(async (itemData: VaultItemForm) => {
    if (!masterPassword || !crypto) return

    setLoading(true)
    try {
      // Upload das imagens se houver alguma selecionada
      let imageUrls = itemData.images || []

      // Verificar se há imagens selecionadas passadas no parâmetro
      const imagesToUpload = (itemData as any).selectedImages || selectedImages || []
      
      if (imagesToUpload.length > 0) {

        const uploadedUrls = await uploadImages(imagesToUpload)

        if (uploadedUrls.length > 0) {
          // Combinar URLs existentes com as novas
          imageUrls = [...(itemData.images || []), ...uploadedUrls]
        }
      }

      // Preparar senha mestre com padding para atender requisito mínimo
      const paddedPassword = masterPassword.padEnd(8, '0')
      
      // Criptografar dados sensíveis com a senha mestre (apenas se houver senha)
      let encryptedData
      if (itemData.password && itemData.category !== 'link') {
        // Para senhas: criptografar password e notes
        encryptedData = await crypto.encryptVaultData({
          password: itemData.password,
          notes: itemData.notes || ''
        }, paddedPassword)
      } else {
        // Para links ou quando não há senha: criar dados vazios/não criptografados
        encryptedData = {
          encryptedData: itemData.password || '',
          salt: Math.random().toString(36).substring(7),
          iv: Math.random().toString(36).substring(7)
        }
      }

      // Calcular força da senha (0 se não houver senha)
      const strength = itemData.password && crypto ? crypto.evaluatePasswordStrength(itemData.password) : { score: 0 }

      const payload = {
        title: itemData.title,
        url: itemData.url || '',
        username: itemData.username || '',
        encrypted_password: encryptedData.encryptedData,
        encrypted_notes: itemData.category === 'link' 
          ? '' // Para links, não salvar notas
          : (itemData.notes ? encryptedData.encryptedData : ''), // Para senhas, criptografar
        salt: encryptedData.salt,
        iv: encryptedData.iv,
        category: itemData.category,
        favorite: itemData.favorite,
        image_url: imageUrls.join(','), // Múltiplas URLs separadas por vírgula
        strength_score: itemData.password && itemData.category !== 'link' ? (strength.score || 50) : 0,
        visibility_level: 'custom', // Sempre usar custom no novo sistema
        allowed_departments: itemData.allowed_departments || [],
        shared_with_managers: itemData.shared_with_managers || false,
        shared_with_admins: itemData.shared_with_admins || false
      }

      const supabase = await getSupabaseClient()
      const { data: authData } = await supabase.auth.getSession()
      
      if (!authData.session) {
        throw new Error('Sessão não encontrada')
      }

      let response
      if (editingItem) {
        // Atualizar item existente
        response = await fetch('/api/vault/items', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.session.access_token}`
          },
          body: JSON.stringify({ ...payload, id: editingItem.id })
        })
      } else {
        // Criar novo item
        response = await fetch('/api/vault/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.session.access_token}`
          },
          body: JSON.stringify(payload)
        })
      }

      if (!response.ok) {
        throw new Error('Erro ao salvar item')
      }

      const { data: savedItem } = await response.json()

      // Atualizar lista local
      if (editingItem) {
        setItems(prev => prev.map(item => 
          item.id === editingItem.id ? savedItem : item
        ))
        toast({ title: 'Sucesso', description: 'Item atualizado com sucesso' })
      } else {
        setItems(prev => [savedItem, ...prev])
        toast({ title: 'Sucesso', description: 'Item criado com sucesso' })
      }

      // Reset form
      setFormData({
        title: '',
        url: '',
        username: '',
        password: '',
        notes: '',
        category: 'login',
        favorite: false,
        image_url: '',
        visibility_level: 'custom',
        allowed_departments: [],
        shared_with_managers: false,
        shared_with_admins: false
      })

      setSelectedImages([])
      setImagePreviews([])
      setShowAddModal(false)
      setShowEditModal(false)
      setEditingItem(null)
      
    } catch (error) {

      toast({ 
        title: 'Erro', 
        description: 'Falha ao salvar item',
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }, [masterPassword, crypto, editingItem, toast])

  const deleteItem = useCallback(async (itemId: string) => {
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: authData } = await supabase.auth.getSession()
      
      if (!authData.session) {
        throw new Error('Sessão não encontrada')
      }

      const response = await fetch(`/api/vault/items?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar item')
      }

      setItems(prev => prev.filter(item => item.id !== itemId))
      toast({ title: 'Sucesso', description: 'Item removido com sucesso' })
      
    } catch (error) {

      toast({ 
        title: 'Erro', 
        description: 'Falha ao remover item',
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ 
        title: 'Copiado', 
        description: `${label} copiado para a área de transferência` 
      })
    } catch (error) {
      toast({ 
        title: 'Erro', 
        description: 'Falha ao copiar para a área de transferência',
        variant: 'destructive' 
      })
    }
  }, [toast])

  const copyDecryptedPassword = useCallback(async (item: VaultItemDisplay) => {
    if (!crypto || !masterPassword) {
      toast({ 
        title: 'Erro', 
        description: 'Sessão expirada, desbloqueie o vault novamente',
        variant: 'destructive' 
      })
      return
    }

    // Verificar se há senha criptografada para copiar
    if (!item.encrypted_password || item.encrypted_password === '') {
      toast({ 
        title: 'Nenhuma senha', 
        description: 'Este item não possui uma senha para copiar',
        variant: 'destructive' 
      })
      return
    }

    // Verificar se é um item de debug/placeholder
    if (item.encrypted_password === 'DEBUG_ENCRYPTED_PASSWORD' || 
        item.salt === 'DEBUG_SALT' || 
        item.iv === 'DEBUG_IV') {
      toast({ 
        title: 'Item de Teste Antigo', 
        description: 'Este item foi criado durante testes. Delete e crie novamente para usar criptografia real.',
        variant: 'destructive'
      })
      return
    }

    try {
      // Preparar senha mestre com padding para descriptografia
      const paddedPassword = masterPassword.padEnd(8, '0')
      
      // Descriptografar os dados do vault
      const decryptedData = await crypto.decryptVaultData({
        encryptedData: item.encrypted_password,
        salt: item.salt,
        iv: item.iv
      }, paddedPassword)

      // Extrair apenas a senha do objeto descriptografado
      const passwordString = decryptedData.password

      // Copiar para área de transferência
      await navigator.clipboard.writeText(passwordString)
      
      toast({ 
        title: 'Senha Copiada', 
        description: 'Senha copiada para a área de transferência' 
      })
    } catch (error) {

      toast({ 
        title: 'Erro', 
        description: 'Esta senha não pode ser descriptografada (item antigo ou corrompido)',
        variant: 'destructive' 
      })
    }
  }, [crypto, masterPassword, toast])

  // ===== FILTROS E BUSCA =====

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filtro por aba ativa
      if (activeTab === 'passwords') {
        // Aba de senhas: excluir links
        if (item.category === 'link') return false
      } else if (activeTab === 'links') {
        // Aba de links: apenas links
        if (item.category !== 'link') return false
      }
      
      // Filtro por busca
      if (searchQuery === '') return true
      
      const search = searchQuery.toLowerCase()
      return item.title.toLowerCase().includes(search) ||
        (item.url && item.url.toLowerCase().includes(search)) ||
        (item.username && item.username.toLowerCase().includes(search))
    }).sort((a, b) => {
      // Ordenar por data de criação (mais recente primeiro)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [items, searchQuery, activeTab])

  // ===== HELPERS =====

  const getUserDepartmentOptions = () => {
    const permissions = getUserVaultPermissions()
    if (!permissions) return []
    
    const options = [permissions.department]
    
    // Se é admin ou gestor, pode criar para outros departamentos
    if (permissions.can_access_cross_department) {
      options.push(...USER_DEPARTMENTS.map(d => d.value))
    }
    
    return [...new Set(options)] // Remove duplicatas
  }

  // ===== DETECÇÃO DE IP =====
  
  const detectUserIP = useCallback(async () => {
    try {
      // Usar múltiplas APIs para detectar IP
      const ipSources = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://api.myip.com'
      ]
      
      for (const source of ipSources) {
        try {
          const response = await fetch(source)
          const data = await response.json()
          const ip = data.ip || data.query || data.address
          if (ip) {
            setUserIP(ip)
            return
          }
        } catch {
          continue
        }
      }
      
      // Fallback: usar informações do navegador
      setUserIP('IP não detectado')
    } catch (error) {
      setUserIP('IP não detectado')
    }
  }, [])

  // ===== TRACKING DE ATIVIDADE =====
  
  const updateActivity = useCallback(() => {
    setLastActivity(new Date())
  }, [])

  // ===== VERIFICAÇÃO DE SESSÃO SALVA =====
  
  const checkSavedSession = useCallback(async () => {
    const savedSession = loadVaultSession()
    if (savedSession) {
      try {
        // Recuperar senha mestre da sessão salva
        const password = atob(savedSession.hash)
        
        // Restaurar vault diretamente sem usar unlockVault para evitar loop
        setLoading(true)
        
        const supabase = await getSupabaseClient()
        const { data: authData } = await supabase.auth.getSession()
        
        if (!authData.session) {
          clearVaultSession()
          setLoading(false)
          return
        }

        const response = await fetch('/api/vault/items', {
          headers: {
            'Authorization': `Bearer ${authData.session.access_token}`
          }
        })

        if (!response.ok) {
          clearVaultSession()
          setLoading(false)
          return
        }

        const { data: vaultItems } = await response.json()

        // Restaurar estado
        setMasterPassword(password)
        setIsUnlocked(true)
        setItems(vaultItems || [])
        saveVaultSession(password)
        
        // Carregar perfil
        await loadUserProfile()
        
        setLoading(false)

      } catch (error) {

        clearVaultSession()
        setLoading(false)
      }
    }
  }, [loadVaultSession, clearVaultSession, saveVaultSession, loadUserProfile])

  // ===== INICIALIZAÇÃO =====
  
  useEffect(() => {
    const initializeVault = async () => {
      // Inicializar crypto apenas no cliente
      const cryptoInstance = useVaultCrypto()
      setCrypto(cryptoInstance)
      
      // Detectar IP do usuário
      detectUserIP()
      
      // Auto-desbloquear o vault imediatamente
      setIsUnlocked(true)
      setMasterPassword('777')
      setSessionToken('auto-session')
      
      // Carregar itens do vault automaticamente
      setTimeout(async () => {
        await unlockVault('777', false)
      }, 500)
      
      // Marcar inicialização como completa
      setIsInitializing(false)
    }
    
    initializeVault()
  }, []) // Sem dependências para executar apenas uma vez

  // Monitorar atividade do usuário
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      if (isUnlocked) {
        updateActivity()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [isUnlocked, updateActivity])

  // ===== AUTO-LOCK DESABILITADO =====
  // Vault permanece sempre desbloqueado - sem timeout por inatividade

  // ===== AUTO-LOCK POR TEMPO MÁXIMO DESABILITADO =====
  useEffect(() => {
    if (false) return // Desabilitado

    const checkSessionExpiry = () => {
      const savedSession = loadVaultSession()
      if (!savedSession) {
        // Se não há sessão salva mas está desbloqueado, bloquear
        lockVault()
        return
      }

      const now = Date.now()
      const thirtyMinutes = 30 * 60 * 1000

      if (now - savedSession.timestamp > thirtyMinutes) {
        lockVault()
        toast({
          title: 'Sessão Expirada',
          description: 'Vault bloqueado - tempo máximo de sessão atingido (30 min)',
          variant: 'default'
        })
      }
    }

    // Verificar a cada minuto
    const interval = setInterval(checkSessionExpiry, 60 * 1000)

    return () => clearInterval(interval)
  }, [isUnlocked, loadVaultSession, lockVault, toast])

  // ===== RENDERIZAÇÃO =====

  // Mostrar loading durante inicialização para evitar flicker
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-center min-h-screen p-6">
          <Card className="w-full max-w-md">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <h3 className="text-lg font-medium mb-2">Inicializando Vault</h3>
              <p className="text-sm text-muted-foreground">
                Verificando sessão salva...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Vault sempre desbloqueado - código de login removido

  return (
    <>
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Vault de Senhas</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
                <span>•</span>
                <span>IP: {userIP}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Badge da função do usuário */}
              {userProfile && (
                <Badge 
                  variant={userProfile.role === 'admin' ? 'default' : 'secondary'} 
                  className="h-8 px-3"
                >
                  {(() => {
                    const roleInfo = {
                      'admin': { icon: '🛡️', label: 'Administrador' },
                      'editor': { icon: '🎬', label: 'Editor' },
                      'copywriter': { icon: '✏️', label: 'Copywriter' },
                      'gestor_trafego': { icon: '📊', label: 'Gestor de Tráfego' },
                      'minerador': { icon: '⛏️', label: 'Minerador' }
                    }
                    const role = roleInfo[userProfile.role as TeamRole] || { icon: '👤', label: 'Usuário' }
                    return (
                      <>
                        <span className="mr-1">{role.icon}</span>
                        {role.label}
                      </>
                    )
                  })()}
                </Badge>
              )}
              
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setShowPermissions(false)
                  // Definir categoria padrão baseada na aba ativa
                  setFormData(prev => ({
                    ...prev,
                    category: activeTab === 'links' ? 'link' : 'login'
                  }))
                  setShowAddModal(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'links' ? 'Novo Link' : 'Nova Senha'}
              </Button>
            </div>
          </div>

          {/* Abas de navegação */}
          <div className="mb-6">
            <div className="flex gap-3 p-1.5 bg-muted rounded-xl w-fit mx-auto">
              <Button
                variant={activeTab === 'passwords' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('passwords')}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'passwords' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                }`}
              >
                <Shield className="w-4 h-4 mr-2" />
                Senhas
              </Button>
              <Button
                variant={activeTab === 'links' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('links')}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'links' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                }`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Links
              </Button>
            </div>
          </div>

          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'links' ? 'Buscar links...' : 'Buscar senhas...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de itens */}
        {filteredItems.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-16 text-center">
              {activeTab === 'links' ? (
                <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              ) : (
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              )}
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery 
                  ? `Nenhum ${activeTab === 'links' ? 'link' : 'senha'} encontrado` 
                  : `Sua aba de ${activeTab === 'links' ? 'links' : 'senhas'} está vazia`
                }
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? `Nenhum ${activeTab === 'links' ? 'link' : 'senha'} corresponde à busca "${searchQuery}"`
                  : activeTab === 'links' 
                    ? 'Comece adicionando seu primeiro link importante para manter organizados seus recursos'
                    : 'Comece adicionando sua primeira senha para manter suas credenciais seguras'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    category: activeTab === 'links' ? 'link' : 'login'
                  }))
                  setShowAddModal(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {activeTab === 'links' ? 'Adicionar Primeiro Link' : 'Adicionar Primeira Senha'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.title}</h3>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {item.url}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Badge da categoria */}
                      <Badge variant="outline" className="text-xs">
                        {VAULT_CATEGORIES.find(cat => cat.value === item.category)?.icon}{' '}
                        {VAULT_CATEGORIES.find(cat => cat.value === item.category)?.label}
                      </Badge>
                      
                      {/* Ícone de favorito */}
                      {item.favorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {/* Mostrar campos de credencial apenas para não-links */}
                    {item.category !== 'link' && (
                      <>
                        {item.username && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Usuário</Label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs sm:text-sm truncate flex-1">{item.username}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(item.username!, 'Usuário')}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Mostrar seção de senha apenas se houver senha criptografada */}
                        {item.encrypted_password && item.encrypted_password !== '' && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Senha</Label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs sm:text-sm">••••••••</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyDecryptedPassword(item)}
                                title="Copiar senha"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Botões de ação específicos para links */}
                    {item.category === 'link' && item.url && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(item.url, '_blank')}
                          className="flex-1"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Abrir Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(item.url!, 'URL')}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Mostrar imagens se houver */}
                    {item.image_url && (
                      <div>
                        {(() => {
                          const allImages = item.image_url ? item.image_url.split(',').filter(url => url.trim()) : []
                          return (
                            <>
                              <Label className="text-xs text-muted-foreground">Imagens ({allImages.length})</Label>
                              <div className="mt-1 flex gap-2 flex-wrap">
                                {allImages.slice(0, 3).map((imageUrl, index) => (
                                  <img
                                    key={index}
                                    src={imageUrl}
                                    alt={`Imagem ${index + 1} de ${item.title}`}
                                    className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setLightboxImage({
                                      url: imageUrl,
                                      name: `${item.title} - Imagem ${index + 1}`
                                    })}
                                  />
                                ))}
                                {allImages.length > 3 && (
                                  <div className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center text-xs text-muted-foreground">
                                    +{allImages.length - 3}
                                  </div>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* Seção de acesso simplificada */}
                  {(item.allowed_departments && item.allowed_departments.length > 0) && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {item.allowed_departments.map(deptValue => {
                          const deptInfo = [
                            { value: 'editor', label: 'Editor', icon: '🎬' },
                            { value: 'copywriter', label: 'Copy', icon: '✏️' },
                            { value: 'gestor', label: 'Gestor', icon: '📊' },
                            { value: 'minerador', label: 'Minerador', icon: '⛏️' }
                          ].find(d => d.value === deptValue)
                          
                          return deptInfo ? (
                            <Badge key={deptValue} variant="outline" className="text-xs">
                              {deptInfo.icon} {deptInfo.label}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              let decryptedPassword = ''
                              
                              // Tentar descriptografar a senha apenas se houver dados criptografados válidos
                              if (crypto && masterPassword && 
                                  item.encrypted_password && 
                                  item.encrypted_password !== '' &&
                                  item.encrypted_password !== 'DEBUG_ENCRYPTED_PASSWORD' &&
                                  item.salt && 
                                  item.salt !== '' &&
                                  item.salt !== 'DEBUG_SALT' && 
                                  item.iv &&
                                  item.iv !== '' &&
                                  item.iv !== 'DEBUG_IV') {
                                
                                const paddedPassword = masterPassword.padEnd(8, '0')
                                const decryptedData = await crypto.decryptVaultData({
                                  encryptedData: item.encrypted_password,
                                  salt: item.salt,
                                  iv: item.iv
                                }, paddedPassword)
                                
                                decryptedPassword = decryptedData.password
                              }
                              
                              setEditingItem(item)
                              setFormData({
                                title: item.title,
                                url: item.url || '',
                                username: item.username || '',
                                password: decryptedPassword,
                                notes: '', // Será preenchido no modal se necessário
                                category: item.category,
                                favorite: item.favorite,
                                images: item.image_url ? item.image_url.split(',').filter(url => url.trim()) : [],
                                visibility_level: 'custom',
                                allowed_departments: item.allowed_departments || [],
                                shared_with_managers: item.shared_with_managers || false,
                                shared_with_admins: item.shared_with_admins || false
                              })
                              // Limpar estados de novas imagens (não mostrar existentes como "novas")
                              setImagePreviews([])
                              setSelectedImages([])
                              setShowPermissions(false) // Reset o estado do collapse
                              setShowEditModal(true)
                            } catch (error) {

                              toast({
                                title: 'Erro',
                                description: 'Não foi possível descriptografar a senha para edição',
                                variant: 'destructive'
                              })
                            }
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar dados
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm('Tem certeza que deseja remover este item?')) {
                              deleteItem(item.id)
                            }
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal para adicionar/editar item */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        // Só fechar se o usuário clicar fora ou no X
        if (!open) {
          setShowAddModal(false)
          setShowEditModal(false)
          setEditingItem(null)
          setFormData({
            title: '',
            url: '',
            username: '',
            password: '',
            notes: '',
            category: 'login',
            favorite: false,
            images: [],
            visibility_level: 'custom',
            allowed_departments: [],
            shared_with_managers: false,
            shared_with_admins: false
          })
          setSelectedImages([])
          setImagePreviews([])
        }
      }}>
        <DialogContent className="w-full max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? `Editar ${editingItem.category === 'link' ? 'Link' : 'Item'}` 
                : (activeTab === 'links' ? 'Adicionar Novo Link' : 'Adicionar Nova Senha')
              }
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? `Edite as informações do ${editingItem.category === 'link' ? 'link' : 'item'} selecionado` 
                : activeTab === 'links'
                  ? 'Preencha os campos para adicionar um novo link importante ao vault'
                  : 'Preencha os campos para adicionar uma nova senha ao vault'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder={formData.category === 'link' ? 'Ex: Documentation React, Tutorial CSS...' : 'Ex: Gmail, Facebook...'}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Sistema de Permissões por Checkbox - Colapsável */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPermissions(!showPermissions)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <Label className="text-sm font-medium cursor-pointer">Permissões de acesso</Label>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mini resumo das permissões atuais */}
                  <div className="flex items-center gap-1">
                    {formData.allowed_departments && formData.allowed_departments.length > 0 ? (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          {formData.allowed_departments.length} departamento{formData.allowed_departments.length !== 1 ? 's' : ''}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">Apenas você</Badge>
                    )}
                  </div>
                  {showPermissions ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>
              
              {showPermissions && (
                <div className="p-4 pt-0 space-y-3 border-t">
                  <Label className="text-sm text-muted-foreground">
                    Selecione os departamentos com permissão de acesso:
                  </Label>
                  
                  {/* Administrador sempre tem acesso (apenas informativo) */}
                  <div className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">🛡️</span>
                        <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                          Administrador
                        </Label>
                      </div>
                      <div className="text-green-600 text-xs font-medium">✅ Sempre</div>
                    </div>
                  </div>
                  
                  {/* Checkboxes para outros departamentos - versão compacta */}
                  <div className="space-y-2">
                    {[
                      { value: 'editor', label: 'Editor', icon: '🎬' },
                      { value: 'copywriter', label: 'Copywriter', icon: '✏️' },
                      { value: 'gestor', label: 'Gestor de Tráfego', icon: '📊' },
                      { value: 'minerador', label: 'Minerador', icon: '⛏️' }
                    ].map((dept) => (
                      <div key={dept.value} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{dept.icon}</span>
                          <Label htmlFor={`access-${dept.value}`} className="text-sm cursor-pointer">
                            {dept.label}
                          </Label>
                        </div>
                        <Switch
                          id={`access-${dept.value}`}
                          checked={formData.allowed_departments?.includes(dept.value as UserDepartment) || false}
                          onCheckedChange={(checked) => {
                            const currentDepts = formData.allowed_departments || []
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                allowed_departments: [...currentDepts, dept.value as UserDepartment]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                allowed_departments: currentDepts.filter(d => d !== dept.value)
                              }))
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="url">{formData.category === 'link' ? 'URL *' : 'URL/Site'}</Label>
              <Input
                id="url"
                placeholder={formData.category === 'link' ? 'https://exemplo.com' : 'https://...'}
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            
            {/* Campos específicos para senhas (não mostrar para links) */}
            {formData.category !== 'link' && (
              <>
                <div>
                  <Label htmlFor="username">Usuário/Email</Label>
                  <Input
                    id="username"
                    placeholder="seu-email@exemplo.com"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="flex gap-2">
                      {editingItem && formData.password && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(formData.password)
                              toast({
                                title: 'Senha Copiada',
                                description: 'Senha copiada para a área de transferência'
                              })
                            } catch (error) {
                              toast({
                                title: 'Erro',
                                description: 'Não foi possível copiar a senha',
                                variant: 'destructive'
                              })
                            }
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar Senha
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (crypto) {
                            const generated = crypto.generateSecurePassword(16)
                            setFormData(prev => ({ ...prev, password: generated }))
                          }
                        }}
                      >
                        Gerar Senha
                      </Button>
                    </div>
                  </div>
                  <Input
                    id="password"
                    type="text"
                    placeholder="Digite ou gere uma senha segura"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* Campo de Upload de Múltiplas Imagens - apenas para senhas */}
            {formData.category !== 'link' && (
              <div>
                <Label htmlFor="image">Imagens</Label>
              <div className="space-y-3">
                {/* Preview das imagens existentes */}
                {editingItem && formData.images && formData.images.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Imagens salvas:</p>
                    <div className="flex gap-2 flex-wrap">
                      {formData.images.map((imageUrl, index) => (
                        <div key={index} className="relative inline-block">
                          <img
                            src={imageUrl}
                            alt={`Imagem ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxImage({
                              url: imageUrl,
                              name: `${formData.title || 'Vault'} - Imagem ${index + 1}`
                            })}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 w-6 h-6"
                            onClick={() => {
                              const newImages = formData.images?.filter((_, i) => i !== index) || []
                              setFormData(prev => ({ ...prev, images: newImages }))
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview das novas imagens selecionadas */}
                {imagePreviews.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Novas imagens selecionadas:</p>
                    <div className="flex gap-2 flex-wrap">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative inline-block">
                          <img
                            src={preview}
                            alt={`Nova imagem ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxImage({
                              url: preview,
                              name: `Nova imagem ${index + 1}`
                            })}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 w-6 h-6"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Input de upload */}
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4 mr-2" />
                    )}
                    {uploading ? 'Enviando...' : 'Adicionar Imagens'}
                  </Button>
                  {(imagePreviews.length > 0 || (formData.images && formData.images.length > 0)) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearImages}
                    >
                      Limpar Todas
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB por imagem. Selecione múltiplas imagens.
                </p>
              </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  // Incluir as imagens selecionadas no formData antes de salvar
                  const dataToSave = {
                    ...formData,
                    selectedImages: selectedImages // Passar as imagens selecionadas
                  }
                  saveItem(dataToSave)
                }}
                disabled={
                  !formData.title || 
                  (formData.category === 'link' && !formData.url) ||
                  loading
                }
              >
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {editingItem ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de imagem usando Portal */}
      {lightboxImage && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-2 transition-all shadow-md z-10"
              type="button"
              aria-label="Fechar imagem"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-2">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-w-full max-h-[80vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}