/**
 * Extrai o ID do Vimeo de uma URL ou retorna o próprio valor se já for um ID
 * 
 * Suporta formatos:
 * - https://vimeo.com/123456789
 * - https://player.vimeo.com/video/123456789
 * - https://vimeo.com/channels/staffpicks/123456789
 * - https://vimeo.com/groups/shortfilms/videos/123456789
 * - 123456789 (apenas o ID)
 */
export function extractVimeoId(input: string): string {
  // Remove espaços em branco
  const trimmed = input.trim()
  
  // Se for apenas números, assumir que já é um ID
  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }
  
  // Regex para capturar ID do Vimeo de várias URLs possíveis
  const patterns = [
    /vimeo\.com\/(\d+)/,                           // vimeo.com/123456789
    /player\.vimeo\.com\/video\/(\d+)/,            // player.vimeo.com/video/123456789
    /vimeo\.com\/channels\/[\w]+\/(\d+)/,          // vimeo.com/channels/staffpicks/123456789
    /vimeo\.com\/groups\/[\w]+\/videos\/(\d+)/,    // vimeo.com/groups/shortfilms/videos/123456789
    /vimeo\.com\/[\w]+\/(\d+)/,                    // vimeo.com/user/123456789
  ]
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  // Se não encontrar um padrão válido, retornar o input original
  // (deixar a validação para o Vimeo Player)
  return trimmed
}

/**
 * Valida se uma string é um ID válido do Vimeo (apenas números)
 */
export function isValidVimeoId(id: string): boolean {
  return /^\d+$/.test(id)
}

/**
 * Formata um ID do Vimeo para URL completa
 */
export function formatVimeoUrl(id: string): string {
  return `https://vimeo.com/${id}`
}