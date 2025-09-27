// Funções de validação para formulários

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/[^\d]/g, '')
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false
  
  // Verifica se não é sequência repetida
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Calcula os dígitos verificadores
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i)
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i)
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  
  return parseInt(cleanCPF[9]) === digit1 && parseInt(cleanCPF[10]) === digit2
}

export function validatePhone(phone: string): boolean {
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/[^\d]/g, '')
  
  // Verifica se tem 10 ou 11 dígitos (com DDD)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11
}

export function validateCEP(cep: string): boolean {
  // Remove caracteres não numéricos
  const cleanCEP = cep.replace(/[^\d]/g, '')
  
  // Verifica se tem 8 dígitos
  return cleanCEP.length === 8
}

export function validateRequired(value: string): boolean {
  return value.trim().length > 0
}

export function validateMinAge(birthDate: string, minAge: number = 18): boolean {
  if (!birthDate) return false
  
  const birth = new Date(birthDate)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= minAge
  }
  
  return age >= minAge
}

// Estados brasileiros para validação
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

// Estados civis para validação
export const MARITAL_STATUS_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
]

export function validateBrazilianState(state: string): boolean {
  return BRAZILIAN_STATES.some(s => s.value === state)
}

export function validateMaritalStatus(status: string): boolean {
  return MARITAL_STATUS_OPTIONS.some(s => s.value === status)
}