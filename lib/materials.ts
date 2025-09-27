import { getSupabaseClient } from '@/lib/supabase/client'

export interface Material {
  id: string
  product_id: string
  title: string
  description?: string
  file_url: string
  file_type: string
  file_size?: number
  thumbnail_url?: string
  category: string
  tags?: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateMaterialData {
  product_id: string
  title: string
  description?: string
  file_url: string
  file_type: string
  file_size?: number
  thumbnail_url?: string
  category: string
  tags?: string[]
}

export interface UpdateMaterialData {
  title?: string
  description?: string
  category?: string
  tags?: string[]
}

// Get all materials for a product
export async function getMaterialsByProductId(productId: string): Promise<Material[]> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from('product_materials')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching materials:', error)
    throw error
  }

  return data || []
}

// Create a new material
export async function createMaterial(materialData: CreateMaterialData): Promise<Material> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from('product_materials')
    .insert([materialData])
    .select()
    .single()

  if (error) {
    console.error('Error creating material:', error)
    throw error
  }

  return data
}

// Update an existing material
export async function updateMaterial(id: string, updates: UpdateMaterialData): Promise<Material> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase
    .from('product_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating material:', error)
    throw error
  }

  if (!data) {
    throw new Error(`Material with id ${id} not found`)
  }

  return data
}

// Delete a material
export async function deleteMaterial(id: string): Promise<void> {
  const supabase = await getSupabaseClient()

  const { error } = await supabase
    .from('product_materials')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting material:', error)
    throw error
  }
}

// Upload file to Supabase Storage (optional - for when implementing real file upload)
export async function uploadMaterialFile(file: File, fileName: string): Promise<string> {
  const supabase = await getSupabaseClient()

  const { data, error } = await supabase.storage
    .from('materials')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading file:', error)
    throw error
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('materials')
    .getPublicUrl(data.path)

  return publicUrl
}