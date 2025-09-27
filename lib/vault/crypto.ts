// 🔐 Biblioteca de Criptografia Client-Side para Vault
// Zero-Knowledge Architecture - senhas NUNCA são enviadas em texto claro

/**
 * ARQUITETURA DE SEGURANÇA:
 * 
 * 1. Deriva chave da senha mestre usando PBKDF2 + salt único
 * 2. Criptografa dados com AES-256-GCM (authenticated encryption)
 * 3. Gera IV único para cada operação
 * 4. Dados nunca existem descriptografados no servidor
 */

import { z } from 'zod'

// ===== TIPOS E VALIDAÇÕES =====

export interface CryptoConfig {
  iterations: number    // PBKDF2 iterations (mínimo 100000)
  saltLength: number   // Salt length em bytes
  ivLength: number     // IV length em bytes
  keyLength: number    // Derived key length em bytes
}

export interface EncryptedData {
  encryptedData: string  // Dados criptografados (base64)
  salt: string          // Salt usado (base64)
  iv: string           // IV usado (base64)
  tag?: string         // Authentication tag (base64)
}

export interface VaultItemData {
  password: string
  notes?: string
  customFields?: Record<string, string>
}

// Configuração padrão de segurança
const DEFAULT_CONFIG: CryptoConfig = {
  iterations: 200000,  // 200k iterations (recomendação OWASP 2023)
  saltLength: 32,      // 256 bits
  ivLength: 12,        // 96 bits para GCM
  keyLength: 32,       // 256 bits
}

// Validações Zod
const MasterPasswordSchema = z.string()
  .min(8, 'Senha mestre deve ter pelo menos 8 caracteres')
  .max(128, 'Senha mestre muito longa')

const PasswordDataSchema = z.object({
  password: z.string().min(1, 'Senha não pode estar vazia'),
  notes: z.string().optional(),
  customFields: z.record(z.string()).optional(),
})

// ===== CLASSE PRINCIPAL DE CRIPTOGRAFIA =====

export class VaultCrypto {
  private config: CryptoConfig
  private textEncoder = new TextEncoder()
  private textDecoder = new TextDecoder()

  constructor(config: Partial<CryptoConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // Verificar se Web Crypto API está disponível (apenas no cliente)
    if (typeof window !== 'undefined') {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API não suportada neste navegador')
      }
    }
  }

  // ===== FUNÇÕES DE DERIVAÇÃO DE CHAVE =====

  /**
   * Deriva uma chave criptográfica da senha mestre
   */
  private async deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
    if (typeof window === 'undefined') {
      throw new Error('Crypto operations only available in browser')
    }
    
    // Validar senha mestre
    MasterPasswordSchema.parse(masterPassword)

    // Importar senha mestre como material de chave
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      this.textEncoder.encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    )

    // Derivar chave usando PBKDF2
    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.config.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: this.config.keyLength * 8, // Convert bytes to bits
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Gera salt criptograficamente seguro
   */
  private generateSalt(): Uint8Array {
    if (typeof window === 'undefined') {
      throw new Error('Crypto operations only available in browser')
    }
    return window.crypto.getRandomValues(new Uint8Array(this.config.saltLength))
  }

  /**
   * Gera IV criptograficamente seguro
   */
  private generateIV(): Uint8Array {
    if (typeof window === 'undefined') {
      throw new Error('Crypto operations only available in browser')
    }
    return window.crypto.getRandomValues(new Uint8Array(this.config.ivLength))
  }

  // ===== FUNÇÕES DE CRIPTOGRAFIA =====

  /**
   * Criptografa dados sensíveis do vault
   */
  async encryptVaultData(
    data: VaultItemData,
    masterPassword: string
  ): Promise<EncryptedData> {
    try {
      // Validar dados de entrada
      const validatedData = PasswordDataSchema.parse(data)
      
      // Gerar salt e IV únicos
      const salt = this.generateSalt()
      const iv = this.generateIV()
      
      // Derivar chave da senha mestre
      const key = await this.deriveKey(masterPassword, salt)
      
      // Serializar dados para JSON
      const jsonData = JSON.stringify(validatedData)
      const dataBuffer = this.textEncoder.encode(jsonData)
      
      // Criptografar com AES-GCM
      if (typeof window === 'undefined') {
        throw new Error('Crypto operations only available in browser')
      }
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128, // 128 bits authentication tag
        },
        key,
        dataBuffer
      )
      
      // Converter para base64 para armazenamento
      const encryptedArray = new Uint8Array(encryptedBuffer)
      const encryptedData = this.arrayBufferToBase64(encryptedArray)
      
      return {
        encryptedData,
        salt: this.arrayBufferToBase64(salt),
        iv: this.arrayBufferToBase64(iv),
      }
    } catch (error) {

      throw new Error('Falha ao criptografar dados. Verifique sua senha mestre.')
    }
  }

  /**
   * Descriptografa dados do vault
   */
  async decryptVaultData(
    encryptedData: EncryptedData,
    masterPassword: string
  ): Promise<VaultItemData> {
    try {
      // Validar senha mestre
      MasterPasswordSchema.parse(masterPassword)
      
      // Converter base64 de volta para arrays
      const salt = this.base64ToArrayBuffer(encryptedData.salt)
      const iv = this.base64ToArrayBuffer(encryptedData.iv)
      const dataBuffer = this.base64ToArrayBuffer(encryptedData.encryptedData)
      
      // Derivar chave da senha mestre
      const key = await this.deriveKey(masterPassword, salt)
      
      // Descriptografar com AES-GCM
      if (typeof window === 'undefined') {
        throw new Error('Crypto operations only available in browser')
      }
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: 128,
        },
        key,
        dataBuffer
      )
      
      // Converter de volta para string JSON
      const decryptedText = this.textDecoder.decode(decryptedBuffer)
      const parsedData = JSON.parse(decryptedText)
      
      // Validar dados descriptografados
      return PasswordDataSchema.parse(parsedData)
    } catch (error) {

      if (error instanceof Error && error.name === 'OperationError') {
        throw new Error('Senha mestre incorreta ou dados corrompidos')
      }
      throw new Error('Falha ao descriptografar dados')
    }
  }

  // ===== FUNÇÕES DE VALIDAÇÃO DE SENHA =====

  /**
   * Avalia a força de uma senha
   */
  evaluatePasswordStrength(password: string): {
    score: number
    feedback: string[]
    isStrong: boolean
  } {
    let score = 0
    const feedback: string[] = []

    // Comprimento
    if (password.length >= 8) score += 20
    else feedback.push('Use pelo menos 8 caracteres')
    
    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 10

    // Complexidade
    if (/[a-z]/.test(password)) score += 10
    else feedback.push('Inclua letras minúsculas')
    
    if (/[A-Z]/.test(password)) score += 10
    else feedback.push('Inclua letras maiúsculas')
    
    if (/\d/.test(password)) score += 10
    else feedback.push('Inclua números')
    
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15
    else feedback.push('Inclua símbolos especiais')

    // Penalidades
    if (/(.)\1{2,}/.test(password)) {
      score -= 10
      feedback.push('Evite repetir caracteres')
    }

    // Padrões comuns
    const commonPatterns = ['123', 'abc', 'password', 'admin', 'user']
    for (const pattern of commonPatterns) {
      if (password.toLowerCase().includes(pattern)) {
        score -= 15
        feedback.push(`Evite padrões comuns como "${pattern}"`)
        break
      }
    }

    // Normalizar score
    score = Math.max(0, Math.min(100, score))

    return {
      score,
      feedback,
      isStrong: score >= 70
    }
  }

  /**
   * Gera senha segura
   */
  generateSecurePassword(
    length: number = 16,
    options: {
      includeUppercase?: boolean
      includeLowercase?: boolean
      includeNumbers?: boolean
      includeSymbols?: boolean
      excludeAmbiguous?: boolean
    } = {}
  ): string {
    const defaults = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeAmbiguous: true,
      ...options
    }

    let charset = ''
    
    if (defaults.includeLowercase) {
      charset += defaults.excludeAmbiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
    }
    
    if (defaults.includeUppercase) {
      charset += defaults.excludeAmbiguous ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    }
    
    if (defaults.includeNumbers) {
      charset += defaults.excludeAmbiguous ? '23456789' : '0123456789'
    }
    
    if (defaults.includeSymbols) {
      charset += defaults.excludeAmbiguous ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~'
    }

    if (!charset) {
      throw new Error('Pelo menos uma categoria de caracteres deve ser selecionada')
    }

    // Gerar senha usando crypto.getRandomValues para segurança
    if (typeof window === 'undefined') {
      throw new Error('Password generation only available in browser')
    }
    const password = []
    const randomValues = new Uint32Array(length)
    window.crypto.getRandomValues(randomValues)

    for (let i = 0; i < length; i++) {
      password.push(charset[randomValues[i] % charset.length])
    }

    return password.join('')
  }

  // ===== FUNÇÕES DE UTILIDADE =====

  /**
   * Converte ArrayBuffer para Base64
   */
  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Converte Base64 para ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Limpa string da memória (best effort)
   */
  clearString(str: string): void {
    // Em JavaScript não é possível limpar completamente da memória
    // mas podemos sobrescrever a referência
    str = '\x00'.repeat(str.length)
  }

  /**
   * Hash simples para verificação de integridade (não para senhas!)
   */
  async simpleHash(data: string): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Hash operations only available in browser')
    }
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer)
    return this.arrayBufferToBase64(hashBuffer)
  }
}

// ===== INSTÂNCIA SINGLETON =====

let vaultCrypto: VaultCrypto | null = null

export const getVaultCrypto = (): VaultCrypto => {
  // Apenas criar a instância no cliente
  if (typeof window === 'undefined') {
    throw new Error('VaultCrypto is only available in browser')
  }
  
  if (!vaultCrypto) {
    vaultCrypto = new VaultCrypto()
  }
  return vaultCrypto
}

// ===== UTILITÁRIOS EXPORTADOS =====

/**
 * Hook React para criptografia do vault
 */
export const useVaultCrypto = () => {
  // Retornar null durante SSR
  if (typeof window === 'undefined') {
    return null as any
  }
  return getVaultCrypto()
}

/**
 * Testa se a senha mestre está correta tentando descriptografar um item
 */
export const validateMasterPassword = async (
  masterPassword: string,
  testEncryptedData: EncryptedData
): Promise<boolean> => {
  try {
    const crypto = getVaultCrypto()
    await crypto.decryptVaultData(testEncryptedData, masterPassword)
    return true
  } catch {
    return false
  }
}

/**
 * Configurações de segurança do vault
 */
export const VAULT_SECURITY_CONFIG = {
  MIN_MASTER_PASSWORD_LENGTH: 8,
  MAX_MASTER_PASSWORD_LENGTH: 128,
  RECOMMENDED_PASSWORD_LENGTH: 16,
  AUTO_LOCK_MINUTES: 5,
  CLIPBOARD_CLEAR_SECONDS: 30,
  MAX_LOGIN_ATTEMPTS: 3,
  SESSION_TIMEOUT_MINUTES: 60,
} as const

export type VaultSecurityConfig = typeof VAULT_SECURITY_CONFIG