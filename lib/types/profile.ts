// Tipos para o sistema de perfil estendido

export interface ExtendedProfile {
  id: string
  email: string
  name: string | null
  role: string
  avatar_url: string | null
  created_at: string
  updated_at: string
  approved: boolean | null
  approved_at: string | null
  approved_by: string | null
  
  // Campos estendidos
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
  phone: string | null
  marital_status: MaritalStatus | null
}

export type MaritalStatus = 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'uniao_estavel'

export interface RegistrationForm {
  // Dados básicos
  email: string
  password: string
  full_name: string
  
  // Dados pessoais
  birth_date: string
  cpf: string
  rg: string
  phone: string
  marital_status: MaritalStatus
  
  // Endereço
  address_zipcode: string
  address_street: string
  address_number: string
  address_complement?: string
  address_neighborhood: string
  address_city: string
  address_state: string
  
  // Financeiro
  pix_key?: string
}

export interface ProfileUpdateForm {
  full_name?: string
  birth_date?: string
  cpf?: string
  rg?: string
  phone?: string
  marital_status?: MaritalStatus
  address_zipcode?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  pix_key?: string
}

export interface AddressFromCEP {
  street: string
  neighborhood: string
  city: string
  state: string
  cep: string
}

export interface ValidationErrors {
  [key: string]: string | undefined
}

export interface ProfileSectionProps {
  profile: ExtendedProfile
  onSave: (data: Partial<ExtendedProfile>) => Promise<void>
  loading?: boolean
}