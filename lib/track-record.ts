import { getSupabaseClient } from "@/lib/supabase/client"

// Types
export interface TrackRecord {
  id: string
  organization_id: string
  track_record_id: string
  start_date: string
  test_type: TestType
  hypothesis: string
  channel: Channel
  status: TestStatus
  winner_variation_id?: string
  insights?: string
  created_by?: string
  created_at: string
  updated_at: string
  // From view
  winner_name?: string
  winner_description?: string
  variation_count?: number
  created_by_name?: string
  created_by_avatar?: string
}

export interface TrackRecordVariation {
  id: string
  track_record_id: string
  variation_name: string
  description?: string
  is_winner: boolean
  created_at: string
  updated_at: string
}

export interface TrackRecordKPI {
  id: string
  variation_id: string
  kpi_name: KPIName
  kpi_value?: number
  kpi_unit?: string
  created_at: string
  updated_at: string
}

export type TestType = 
  | 'VSL' 
  | 'Headline' 
  | 'CTA' 
  | 'Página' 
  | 'Criativo' 
  | 'Landing Page'
  | 'Email'
  | 'Anúncio'
  | 'Thumbnail'
  | 'Copy'

export type TestStatus = 'Em andamento' | 'Finalizado'

export type Channel = 
  | 'Facebook Ads'
  | 'YouTube'
  | 'Native'
  | 'TikTok'
  | 'Instagram'
  | 'Google Ads'
  | 'Email'
  | 'Organic'
  | 'Outro'

export type KPIName = 
  | 'CTR'
  | 'CPC'
  | 'CPA'
  | 'ROI'
  | 'CVR'
  | 'CPM'
  | 'ROAS'
  | 'LTV'
  | 'Conversões'
  | 'Impressões'
  | 'Cliques'
  | 'Vendas'

export interface CreateTrackRecordData {
  test_type: TestType
  start_date: string
  hypothesis: string
  channel: Channel
  variations: Array<{
    name: string
    description?: string
  }>
}

export interface UpdateTrackRecordData {
  hypothesis?: string
  insights?: string
  status?: TestStatus
}

export interface TrackRecordAssignment {
  id: string
  track_record_id: string
  assignee_id: string
  assigner_id: string
  role: AssignmentRole
  assigned_at: string
  due_date?: string
  completed_at?: string
  status: AssignmentStatus
  notes?: string
  created_at: string
  updated_at: string
  // From join
  assignee_name?: string
  assignee_avatar?: string
  assigner_name?: string
}

export interface TrackRecordAssignmentNotification {
  id: string
  assignment_id: string
  user_id: string
  type: NotificationType
  message: string
  read_at?: string
  created_at: string
}

export type AssignmentRole = 'owner' | 'analyst' | 'reviewer' | 'approver' | 'viewer'

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'

export type NotificationType = 'assigned' | 'deadline_reminder' | 'overdue' | 'completed' | 'reassigned'

export interface CreateAssignmentData {
  track_record_id: string
  assignee_id: string
  role: AssignmentRole
  due_date?: string
  notes?: string
}

export interface TrackRecordFilters {
  test_type?: TestType
  status?: TestStatus
  channel?: Channel
  start_date_from?: string
  start_date_to?: string
  search?: string
}

// Utility functions
export const testTypeOptions: { value: TestType; label: string }[] = [
  { value: 'VSL', label: 'VSL (Video Sales Letter)' },
  { value: 'Headline', label: 'Headline / Título' },
  { value: 'CTA', label: 'CTA (Call to Action)' },
  { value: 'Página', label: 'Página Completa' },
  { value: 'Criativo', label: 'Criativo / Imagem' },
  { value: 'Landing Page', label: 'Landing Page' },
  { value: 'Email', label: 'Email Marketing' },
  { value: 'Anúncio', label: 'Anúncio (Texto)' },
  { value: 'Thumbnail', label: 'Thumbnail' },
  { value: 'Copy', label: 'Copy / Texto' },
]

export const channelOptions: { value: Channel; label: string }[] = [
  { value: 'Facebook Ads', label: 'Facebook Ads' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Google Ads', label: 'Google Ads' },
  { value: 'Native', label: 'Native Ads' },
  { value: 'Email', label: 'Email Marketing' },
  { value: 'Organic', label: 'Orgânico' },
  { value: 'Outro', label: 'Outro' },
]

export const kpiOptions: { value: KPIName; label: string; unit: string }[] = [
  { value: 'CTR', label: 'CTR (Click Through Rate)', unit: '%' },
  { value: 'CPC', label: 'CPC (Cost Per Click)', unit: 'R$' },
  { value: 'CPA', label: 'CPA (Cost Per Acquisition)', unit: 'R$' },
  { value: 'ROI', label: 'ROI (Return on Investment)', unit: '%' },
  { value: 'CVR', label: 'CVR (Conversion Rate)', unit: '%' },
  { value: 'CPM', label: 'CPM (Cost Per Mille)', unit: 'R$' },
  { value: 'ROAS', label: 'ROAS (Return on Ad Spend)', unit: 'x' },
  { value: 'LTV', label: 'LTV (Lifetime Value)', unit: 'R$' },
  { value: 'Conversões', label: 'Conversões', unit: 'un' },
  { value: 'Impressões', label: 'Impressões', unit: 'un' },
  { value: 'Cliques', label: 'Cliques', unit: 'un' },
  { value: 'Vendas', label: 'Vendas', unit: 'un' },
]

// Database functions
export async function getNextTrackRecordId(testType: TestType, organizationId: string): Promise<string> {
  const supabase = getSupabaseClient()
  const year = new Date().getFullYear()
  
  const { data, error } = await supabase.rpc('get_next_track_record_id', {
    test_type: testType,
    test_year: year,
    org_id: organizationId
  })
  
  if (error) {

    // Fallback: generate simple ID
    return `${testType}-${year}-001`
  }
  
  return data
}

export async function createTrackRecord(
  data: CreateTrackRecordData,
  organizationId: string,
  userId: string
): Promise<TrackRecord> {
  const supabase = getSupabaseClient()
  
  // Generate unique ID
  const trackRecordId = await getNextTrackRecordId(data.test_type, organizationId)
  
  // Create track record
  const { data: trackRecord, error: trackRecordError } = await supabase
    .from('track_records')
    .insert({
      organization_id: organizationId,
      track_record_id: trackRecordId,
      start_date: data.start_date,
      test_type: data.test_type,
      hypothesis: data.hypothesis,
      channel: data.channel,
      created_by: userId
    })
    .select()
    .single()
  
  if (trackRecordError) {
    throw new Error(`Error creating track record: ${trackRecordError.message}`)
  }
  
  // Create variations
  const variationsToInsert = data.variations.map(variation => ({
    track_record_id: trackRecord.id,
    variation_name: variation.name,
    description: variation.description || null
  }))
  
  const { error: variationsError } = await supabase
    .from('track_record_variations')
    .insert(variationsToInsert)
  
  if (variationsError) {
    throw new Error(`Error creating variations: ${variationsError.message}`)
  }
  
  return trackRecord
}

export async function getTrackRecords(
  organizationId: string,
  filters?: TrackRecordFilters
): Promise<TrackRecord[]> {
  const supabase = getSupabaseClient()
  
  let query = supabase
    .from('track_record_summary')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  
  if (filters?.test_type) {
    query = query.eq('test_type', filters.test_type)
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters?.channel) {
    query = query.eq('channel', filters.channel)
  }
  
  if (filters?.start_date_from) {
    query = query.gte('start_date', filters.start_date_from)
  }
  
  if (filters?.start_date_to) {
    query = query.lte('start_date', filters.start_date_to)
  }
  
  if (filters?.search) {
    const search = `%${filters.search}%`
    query = query.or(`track_record_id.ilike.${search},hypothesis.ilike.${search},insights.ilike.${search}`)
  }
  
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Error fetching track records: ${error.message}`)
  }
  
  return data || []
}

export async function getTrackRecordWithDetails(id: string): Promise<{
  trackRecord: TrackRecord
  variations: TrackRecordVariation[]
  kpis: { [variationId: string]: TrackRecordKPI[] }
} | null> {
  const supabase = getSupabaseClient()
  
  // Get track record
  const { data: trackRecord, error: trackRecordError } = await supabase
    .from('track_record_summary')
    .select('*')
    .eq('id', id)
    .single()
  
  if (trackRecordError) {

    return null
  }
  
  // Get variations
  const { data: variations, error: variationsError } = await supabase
    .from('track_record_variations')
    .select('*')
    .eq('track_record_id', id)
    .order('variation_name')
  
  if (variationsError) {

    return null
  }
  
  // Get KPIs for all variations
  const variationIds = variations?.map(v => v.id) || []
  const { data: kpiData, error: kpisError } = await supabase
    .from('track_record_kpis')
    .select('*')
    .in('variation_id', variationIds)
    .order('kpi_name')
  
  if (kpisError) {

    return null
  }
  
  // Group KPIs by variation
  const kpis: { [variationId: string]: TrackRecordKPI[] } = {}
  kpiData?.forEach(kpi => {
    if (!kpis[kpi.variation_id]) {
      kpis[kpi.variation_id] = []
    }
    kpis[kpi.variation_id].push(kpi)
  })
  
  return {
    trackRecord,
    variations: variations || [],
    kpis
  }
}

export async function updateTrackRecord(
  id: string,
  data: UpdateTrackRecordData
): Promise<void> {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from('track_records')
    .update(data)
    .eq('id', id)
  
  if (error) {
    throw new Error(`Error updating track record: ${error.message}`)
  }
}

export async function updateVariationKPIs(
  variationId: string,
  kpis: Array<{ kpi_name: KPIName; kpi_value: number; kpi_unit?: string }>
): Promise<void> {
  const supabase = getSupabaseClient()
  
  // Delete existing KPIs for this variation
  const { error: deleteError } = await supabase
    .from('track_record_kpis')
    .delete()
    .eq('variation_id', variationId)
  
  if (deleteError) {
    throw new Error(`Error deleting old KPIs: ${deleteError.message}`)
  }
  
  // Insert new KPIs
  if (kpis.length > 0) {
    const kpisToInsert = kpis.map(kpi => ({
      variation_id: variationId,
      kpi_name: kpi.kpi_name,
      kpi_value: kpi.kpi_value,
      kpi_unit: kpi.kpi_unit || kpiOptions.find(k => k.value === kpi.kpi_name)?.unit
    }))
    
    const { error: insertError } = await supabase
      .from('track_record_kpis')
      .insert(kpisToInsert)
    
    if (insertError) {
      throw new Error(`Error inserting new KPIs: ${insertError.message}`)
    }
  }
}

export async function setWinnerVariation(
  trackRecordId: string,
  variationId: string
): Promise<void> {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from('track_record_variations')
    .update({ is_winner: true })
    .eq('track_record_id', trackRecordId)
    .eq('id', variationId)
  
  if (error) {
    throw new Error(`Error setting winner variation: ${error.message}`)
  }
}

// Export utility function for CSV
export function trackRecordsToCSV(trackRecords: TrackRecord[]): string {
  const headers = [
    'ID',
    'Data de Início',
    'Tipo de Teste',
    'Canal',
    'Status',
    'Hipótese',
    'Variação Vencedora',
    'Insights',
    'Criado em'
  ].join(',')
  
  const rows = trackRecords.map(tr => [
    tr.track_record_id,
    tr.start_date,
    tr.test_type,
    tr.channel,
    tr.status,
    `"${tr.hypothesis.replace(/"/g, '""')}"`,
    tr.winner_name || '',
    tr.insights ? `"${tr.insights.replace(/"/g, '""')}"` : '',
    new Date(tr.created_at).toLocaleDateString('pt-BR')
  ].join(','))
  
  return [headers, ...rows].join('\n')
}

// Assignment functions
export async function getTrackRecordAssignments(trackRecordId: string): Promise<TrackRecordAssignment[]> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('track_record_assignments')
    .select(`
      *,
      assignee:assignee_id(full_name, avatar_url),
      assigner:assigner_id(full_name)
    `)
    .eq('track_record_id', trackRecordId)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Error fetching assignments: ${error.message}`)
  }
  
  return (data || []).map(assignment => ({
    ...assignment,
    assignee_name: assignment.assignee?.full_name,
    assignee_avatar: assignment.assignee?.avatar_url,
    assigner_name: assignment.assigner?.full_name
  }))
}

export async function createTrackRecordAssignment(assignmentData: CreateAssignmentData): Promise<TrackRecordAssignment> {
  const supabase = getSupabaseClient()
  
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('track_record_assignments')
    .insert({
      ...assignmentData,
      assigner_id: user.user.id
    })
    .select(`
      *,
      assignee:assignee_id(full_name, avatar_url),
      assigner:assigner_id(full_name)
    `)
    .single()
  
  if (error) {
    throw new Error(`Error creating assignment: ${error.message}`)
  }
  
  return {
    ...data,
    assignee_name: data.assignee?.full_name,
    assignee_avatar: data.assignee?.avatar_url,
    assigner_name: data.assigner?.full_name
  }
}

export async function updateAssignmentStatus(
  assignmentId: string, 
  status: AssignmentStatus,
  notes?: string
): Promise<void> {
  const supabase = getSupabaseClient()
  
  const updateData: any = { status }
  if (notes) updateData.notes = notes
  if (status === 'completed') updateData.completed_at = new Date().toISOString()
  
  const { error } = await supabase
    .from('track_record_assignments')
    .update(updateData)
    .eq('id', assignmentId)
  
  if (error) {
    throw new Error(`Error updating assignment: ${error.message}`)
  }
}

export async function deleteTrackRecordAssignment(assignmentId: string): Promise<void> {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from('track_record_assignments')
    .delete()
    .eq('id', assignmentId)
  
  if (error) {
    throw new Error(`Error deleting assignment: ${error.message}`)
  }
}

export async function getMyAssignments(): Promise<TrackRecordAssignment[]> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('track_record_assignments')
    .select(`
      *,
      track_record:track_record_id(track_record_id, test_type, hypothesis),
      assigner:assigner_id(full_name)
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Error fetching my assignments: ${error.message}`)
  }
  
  return (data || []).map(assignment => ({
    ...assignment,
    assigner_name: assignment.assigner?.full_name
  }))
}

export async function getAssignmentNotifications(): Promise<TrackRecordAssignmentNotification[]> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('track_record_assignment_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (error) {
    throw new Error(`Error fetching notifications: ${error.message}`)
  }
  
  return data || []
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from('track_record_assignment_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  
  if (error) {
    throw new Error(`Error marking notification as read: ${error.message}`)
  }
}

export const assignmentRoleOptions = [
  { value: 'owner', label: 'Proprietário', description: 'Responsável geral pelo teste' },
  { value: 'analyst', label: 'Analista', description: 'Responsável por análise e KPIs' },
  { value: 'reviewer', label: 'Revisor', description: 'Revisa e aprova alterações' },
  { value: 'approver', label: 'Aprovador', description: 'Aprova resultados finais' },
  { value: 'viewer', label: 'Visualizador', description: 'Apenas visualizar resultados' }
] as const