// Funções de máscara para formatação de campos

export function applyCPFMask(value: string): string {
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '')
  
  // Aplica a máscara XXX.XXX.XXX-XX
  return cleanValue
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

export function applyPhoneMask(value: string): string {
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '')
  
  // Aplica máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  } else {
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }
}

export function applyCEPMask(value: string): string {
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, '')
  
  // Aplica máscara XXXXX-XXX
  return cleanValue
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1')
}

export function removeAllMasks(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCPF(cpf: string): string {
  if (!cpf) return ''
  const cleanCPF = removeAllMasks(cpf)
  return applyCPFMask(cleanCPF)
}

export function formatPhone(phone: string): string {
  if (!phone) return ''
  const cleanPhone = removeAllMasks(phone)
  return applyPhoneMask(cleanPhone)
}

export function formatCEP(cep: string): string {
  if (!cep) return ''
  const cleanCEP = removeAllMasks(cep)
  return applyCEPMask(cleanCEP)
}

// Função para buscar CEP via ViaCEP API
export async function fetchAddressByCEP(cep: string) {
  const cleanCEP = removeAllMasks(cep)
  
  if (cleanCEP.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos')
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
    const data = await response.json()
    
    if (data.erro) {
      throw new Error('CEP não encontrado')
    }
    
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      cep: formatCEP(data.cep || '')
    }
  } catch (error) {

    throw new Error('Erro ao buscar informações do CEP')
  }
}