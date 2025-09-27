// 🔐 Tipos TypeScript para Sistema de Vault
// Definições de tipos para máxima segurança e type safety

// ===== TIPOS PRINCIPAIS DO VAULT =====

export interface VaultItem {
  id: string
  user_id: string
  
  // Metadados básicos (texto claro)
  title: string
  description?: string
  url?: string
  username?: string
  category: VaultCategory
  favorite: boolean
  
  // Campos específicos por tipo de recurso
  file_path?: string        // Para documentos e mídia
  file_type?: string        // MIME type do arquivo
  file_size?: number        // Tamanho do arquivo em bytes
  tags?: string[]           // Tags para organização
  version?: string          // Versão do documento/template
  code_language?: string    // Para snippets de código
  contact_info?: string     // Para contatos (JSON com phone, email, etc)
  
  // Mídia/Imagens
  images?: string[]
  image_url?: string
  
  // Dados criptografados (apenas para credenciais)
  encrypted_password?: string
  encrypted_notes?: string
  
  // Dados de criptografia (apenas quando necessário)
  salt?: string
  iv?: string
  
  // Metadados de segurança (apenas para credenciais)
  strength_score?: number
  has_breach?: boolean
  breach_count?: number
  
  // Sistema de permissões
  visibility_level: VaultVisibilityLevel
  allowed_departments: UserDepartment[]
  created_by_department: UserDepartment
  shared_with_managers: boolean
  shared_with_admins: boolean
  
  // Timestamps
  created_at: string
  updated_at: string
  last_accessed?: string
  password_changed_at: string
}

export interface VaultSettings {
  id: string
  user_id: string
  
  // Configurações de segurança
  auto_lock_minutes: number
  require_master_password: boolean
  clipboard_clear_seconds: number
  
  // Configurações de interface
  show_password_strength: boolean
  show_breach_warnings: boolean
  default_password_length: number
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface VaultAccessLog {
  id: string
  user_id: string
  vault_item_id?: string
  
  // Detalhes da ação
  action: VaultAction
  resource?: string
  
  // Contexto de segurança
  ip_address?: string
  user_agent?: string
  session_id?: string
  
  // Metadados
  metadata: Record<string, any>
  success: boolean
  
  // Análise de risco
  risk_level: RiskLevel
  
  // Timestamp
  created_at: string
}

export interface VaultSession {
  id: string
  user_id: string
  
  // Dados da sessão
  session_token: string
  expires_at: string
  
  // Contexto
  ip_address?: string
  user_agent?: string
  
  // Estado
  is_active: boolean
  last_activity: string
  
  // Timestamps
  created_at: string
}

// ===== ENUMS E CONSTANTES =====

export type VaultCategory = 
  | 'login' 
  | 'credit_card' 
  | 'secure_note' 
  | 'identity' 
  | 'bank_account' 
  | 'crypto_wallet' 
  | 'link'
  | 'other'

export type VaultAction = 
  | 'view' 
  | 'copy' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'unlock' 
  | 'lock'
  | 'export'
  | 'import'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ===== TIPOS PARA SISTEMA DE PERMISSÕES =====

// Mapeia roles da equipe para departamentos do vault
export type TeamRole = 'admin' | 'editor' | 'copywriter' | 'gestor_trafego' | 'minerador'
export type UserDepartment = 'administrador' | 'editor' | 'copywriter' | 'gestor' | 'minerador' | 'particular'

export type UserAccessLevel = 'user' | 'manager' | 'admin'

export type VaultVisibilityLevel = 
  | 'personal'    // Apenas o criador
  | 'custom'      // Departamentos específicos selecionados

// Interface simplificada baseada em profiles.role
export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: TeamRole
  created_at: string
  updated_at: string
}

// Função para mapear role da equipe para permissões do vault
export function getVaultPermissions(teamRole: TeamRole): {
  department: UserDepartment
  access_level: UserAccessLevel
  can_create_shared: boolean
  can_access_cross_department: boolean
} {
  switch (teamRole) {
    case 'admin':
      return {
        department: 'administrador',
        access_level: 'admin',
        can_create_shared: true,
        can_access_cross_department: true
      }
    case 'gestor_trafego':
      return {
        department: 'gestor',
        access_level: 'manager', 
        can_create_shared: true,
        can_access_cross_department: false
      }
    case 'editor':
    case 'copywriter':
    case 'minerador':
      return {
        department: teamRole,
        access_level: 'user',
        can_create_shared: false,
        can_access_cross_department: false
      }
    default:
      return {
        department: 'particular',
        access_level: 'user',
        can_create_shared: false,
        can_access_cross_department: false
      }
  }
}

// ===== TIPOS PARA INTERFACE =====

export interface VaultItemForm {
  title: string
  description?: string
  url?: string
  username?: string
  password?: string
  notes?: string
  category: VaultCategory
  favorite: boolean
  
  // Campos específicos por tipo
  file_path?: string
  file_type?: string
  tags?: string[]
  version?: string
  code_language?: string
  contact_info?: string
  
  // Mídia/Imagens
  images?: string[]
  image_url?: string
  
  // Campos de permissões
  visibility_level?: VaultVisibilityLevel
  allowed_departments?: UserDepartment[]
  shared_with_managers?: boolean
  shared_with_admins?: boolean
}

export interface VaultItemDisplay extends Omit<VaultItem, 'encrypted_password' | 'encrypted_notes' | 'salt' | 'iv'> {
  // Dados descriptografados apenas na memória local
  decrypted_password?: string
  decrypted_notes?: string
  
  // Estado da interface
  isPasswordVisible?: boolean
  isSelected?: boolean
  lastViewed?: Date
}

export interface MasterPasswordForm {
  password: string
  confirmPassword?: string
  rememberForSession: boolean
}

export interface PasswordGeneratorOptions {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  excludeAmbiguous: boolean
}

// ===== TIPOS PARA HOOKS E CONTEXTO =====

export interface VaultContextValue {
  // Estado
  items: VaultItemDisplay[]
  settings: VaultSettings | null
  isUnlocked: boolean
  isLoading: boolean
  lastUnlocked?: Date
  
  // Ações
  unlock: (masterPassword: string) => Promise<boolean>
  lock: () => void
  
  // CRUD de itens
  createItem: (item: VaultItemForm, masterPassword: string) => Promise<void>
  updateItem: (id: string, item: Partial<VaultItemForm>, masterPassword: string) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  
  // Visualização de senhas
  revealPassword: (id: string, masterPassword: string) => Promise<string | null>
  copyPassword: (id: string, masterPassword: string) => Promise<boolean>
  
  // Configurações
  updateSettings: (settings: Partial<VaultSettings>) => Promise<void>
  
  // Utilidades
  generatePassword: (options: PasswordGeneratorOptions) => string
  checkPasswordStrength: (password: string) => PasswordStrength
}

export interface PasswordStrength {
  score: number
  feedback: string[]
  isStrong: boolean
  color: 'red' | 'orange' | 'yellow' | 'green'
  label: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Muito Forte'
}

// ===== TIPOS PARA APIs =====

export interface CreateVaultItemRequest {
  title: string
  url?: string
  username?: string
  encrypted_password: string
  encrypted_notes?: string
  salt: string
  iv: string
  category: VaultCategory
  favorite: boolean
  strength_score: number
}

export interface UpdateVaultItemRequest extends Partial<CreateVaultItemRequest> {
  id: string
}

export interface VaultItemResponse {
  success: boolean
  data?: VaultItem
  error?: string
}

export interface VaultItemsResponse {
  success: boolean
  data?: VaultItem[]
  error?: string
}

export interface VaultSettingsResponse {
  success: boolean
  data?: VaultSettings
  error?: string
}

// ===== TIPOS PARA FILTROS E BUSCA =====

export interface VaultFilter {
  category?: VaultCategory
  favorite?: boolean
  hasWeakPasswords?: boolean
  hasBreaches?: boolean
  searchQuery?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface VaultSortOptions {
  field: 'title' | 'created_at' | 'last_accessed' | 'strength_score'
  direction: 'asc' | 'desc'
}

// ===== TIPOS PARA SEGURANÇA =====

export interface SecurityAnalysis {
  totalItems: number
  weakPasswords: number
  breachedPasswords: number
  duplicatePasswords: number
  oldPasswords: number
  averageStrength: number
  recommendations: SecurityRecommendation[]
}

export interface SecurityRecommendation {
  type: 'weak_password' | 'breached' | 'duplicate' | 'old'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  itemIds: string[]
  action: string
}

// ===== TIPOS PARA IMPORTAÇÃO/EXPORTAÇÃO =====

export interface VaultExportData {
  version: string
  encrypted: boolean
  created_at: string
  items: VaultItem[]
  settings: VaultSettings
}

export interface VaultImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

// ===== TIPOS PARA AUDITORIA =====

export interface SecurityEvent {
  id: string
  type: 'login' | 'unlock' | 'suspicious_activity' | 'breach_detected'
  severity: RiskLevel
  title: string
  description: string
  timestamp: string
  metadata: Record<string, any>
}

export interface VaultAuditReport {
  period: {
    start: string
    end: string
  }
  summary: {
    totalAccesses: number
    uniqueIPs: number
    failedAttempts: number
    suspiciousActivities: number
  }
  events: SecurityEvent[]
  recommendations: string[]
}

// ===== CONSTANTES DE CATEGORIAS =====

export const VAULT_CATEGORIES: Array<{ value: VaultCategory; label: string; icon: string }> = [
  { value: 'login', label: 'Login', icon: '🔐' },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'secure_note', label: 'Nota Segura', icon: '📝' },
  { value: 'identity', label: 'Identidade', icon: '👤' },
  { value: 'bank_account', label: 'Conta Bancária', icon: '🏦' },
  { value: 'crypto_wallet', label: 'Carteira Crypto', icon: '₿' },
  { value: 'link', label: 'Link', icon: '🔗' },
  { value: 'other', label: 'Outros', icon: '📄' },
]

// ===== CONSTANTES PARA PERMISSÕES =====

export const VAULT_VISIBILITY_LEVELS: Array<{ value: VaultVisibilityLevel; label: string; description: string; icon: string }> = [
  { 
    value: 'personal', 
    label: 'Apenas eu', 
    description: 'Somente você pode ver esta senha',
    icon: '🔒' 
  },
  { 
    value: 'custom', 
    label: 'Departamentos Específicos', 
    description: 'Escolha quais departamentos podem acessar',
    icon: '👥' 
  },
]

export const USER_DEPARTMENTS: Array<{ value: UserDepartment; label: string; icon: string; description?: string }> = [
  { value: 'administrador', label: 'Administrador', icon: '🛡️', description: 'Acesso Total' },
  { value: 'editor', label: 'Editor', icon: '🎬', description: 'Editor de vídeo' },
  { value: 'copywriter', label: 'Copywriter', icon: '✏️', description: 'Criação de textos' },
  { value: 'gestor', label: 'Gestor de Tráfego', icon: '📊', description: 'Gestão de campanhas' },
  { value: 'minerador', label: 'Minerador', icon: '⛏️', description: 'Acesso Parcial' },
  { value: 'particular', label: 'Particular', icon: '👤', description: 'Uso pessoal' },
]

export const USER_ACCESS_LEVELS: Array<{ value: UserAccessLevel; label: string; description: string; icon: string }> = [
  { 
    value: 'user', 
    label: 'Usuário', 
    description: 'Acesso básico às próprias senhas',
    icon: '👤' 
  },
  { 
    value: 'manager', 
    label: 'Gestor', 
    description: 'Pode gerenciar senhas da equipe',
    icon: '👔' 
  },
  { 
    value: 'admin', 
    label: 'Administrador', 
    description: 'Acesso total ao sistema',
    icon: '🛡️' 
  },
]

// ===== VALIDAÇÕES ZODE =====

import { z } from 'zod'

export const VaultItemFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título muito longo'),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  username: z.string().max(100, 'Username muito longo').optional(),
  password: z.string().min(1, 'Senha é obrigatória'),
  notes: z.string().max(1000, 'Notas muito longas').optional(),
  category: z.enum(['login', 'credit_card', 'secure_note', 'identity', 'bank_account', 'crypto_wallet', 'link', 'other']),
  favorite: z.boolean().default(false),
})

export const MasterPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Senha mestre deve ter pelo menos 8 caracteres')
    .max(128, 'Senha mestre muito longa'),
  confirmPassword: z.string().optional(),
  rememberForSession: z.boolean().default(false),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.password === data.confirmPassword
  }
  return true
}, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
})

export const PasswordGeneratorOptionsSchema = z.object({
  length: z.number().min(4).max(128).default(16),
  includeUppercase: z.boolean().default(true),
  includeLowercase: z.boolean().default(true),
  includeNumbers: z.boolean().default(true),
  includeSymbols: z.boolean().default(true),
  excludeAmbiguous: z.boolean().default(true),
})

// ===== TIPOS DERIVADOS =====

export type VaultItemFormData = z.infer<typeof VaultItemFormSchema>
export type MasterPasswordFormData = z.infer<typeof MasterPasswordSchema>
export type PasswordGeneratorOptionsData = z.infer<typeof PasswordGeneratorOptionsSchema>

// ===== HELPER TYPES =====

export type VaultItemWithDecrypted = VaultItem & {
  decrypted_password?: string
  decrypted_notes?: string
}

export type VaultItemPreview = Pick<VaultItem, 
  | 'id' 
  | 'title' 
  | 'url' 
  | 'username' 
  | 'category' 
  | 'favorite' 
  | 'strength_score' 
  | 'has_breach'
  | 'created_at' 
  | 'last_accessed'
>