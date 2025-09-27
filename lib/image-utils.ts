/**
 * Utilitários para processamento de imagem no cliente
 */

export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calcular novo tamanho mantendo proporção
        let width = img.width
        let height = img.height
        
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height)
            height = maxHeight
          }
        }
        
        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'))
          return
        }
        
        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height)
        
        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir imagem'))
              return
            }
            
            // Criar novo File a partir do blob
            const compressedFile = new File(
              [blob],
              file.name,
              {
                type: 'image/jpeg',
                lastModified: Date.now()
              }
            )
            
            // Se ainda estiver muito grande, tentar comprimir mais
            if (compressedFile.size > 1024 * 1024 && quality > 0.3) {
              compressImage(file, maxWidth, maxHeight, quality - 0.1)
                .then(resolve)
                .catch(reject)
            } else {
              resolve(compressedFile)
            }
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'))
    }
    
    reader.readAsDataURL(file)
  })
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Verificar tipo
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Por favor, selecione apenas imagens' }
  }
  
  // Verificar tamanho (máx 10MB antes da compressão)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Imagem deve ter no máximo 10MB' }
  }
  
  // Verificar extensão
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !validExtensions.includes(extension)) {
    return { valid: false, error: 'Formato de imagem não suportado' }
  }
  
  return { valid: true }
}