"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { ABTest, Variant, Metric } from '@/lib/ab-tests'

interface ABTestContextType {
  tests: ABTest[]
  variants: Record<string, Variant[]>
  metrics: Record<string, Metric[]>
  loading: boolean
  error: string | null
  refreshTests: () => Promise<void>
  createTest: (test: Partial<ABTest>) => Promise<ABTest>
  updateTest: (id: string, updates: Partial<ABTest>) => Promise<void>
  deleteTest: (id: string) => Promise<void>
  createVariant: (variant: Partial<Variant>) => Promise<Variant>
  updateMetric: (variantId: string, metric: Partial<Metric>) => Promise<void>
}

const ABTestContext = createContext<ABTestContextType | undefined>(undefined)

export function ABTestProvider({ children }: { children: React.ReactNode }) {
  const [tests, setTests] = useState<ABTest[]>([])
  const [variants, setVariants] = useState<Record<string, Variant[]>>({})
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Fetch all tests (no organization filter)
      const { data: testsData, error: testsError } = await supabase
        .from('track_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (testsError) throw testsError

      // Map database fields to our interface
      const mappedTests: ABTest[] = (testsData || []).map(test => ({
        id: test.id,
        organization_id: test.organization_id || 'a214d299-3e9f-4b18-842b-c74dc52b5dfc',
        test_id: test.track_record_id,
        name: test.hypothesis?.substring(0, 50) || 'Teste sem nome',
        hypothesis: test.hypothesis || '',
        test_type: test.test_type,
        channel: test.channel,
        status: test.status === 'Em andamento' ? 'running' : 'completed',
        start_date: test.start_date,
        end_date: test.end_date,
        sample_size: test.sample_size || 0,
        confidence_level: 95,
        created_at: test.created_at,
        updated_at: test.updated_at,
        created_by: test.created_by,
        winner_variant: test.winner_variation_id,
        insights: test.insights
      }))

      setTests(mappedTests)

      // Fetch variants for all tests
      const testIds = mappedTests.map(t => t.id)
      if (testIds.length > 0) {
        const { data: variantsData } = await supabase
          .from('track_record_variations')
          .select('*')
          .in('track_record_id', testIds)

        if (variantsData) {
          const variantsByTest: Record<string, Variant[]> = {}
          variantsData.forEach(v => {
            const variant: Variant = {
              id: v.id,
              test_id: v.track_record_id,
              name: v.variation_name,
              description: v.description || '',
              is_control: v.variation_name === 'A',
              is_winner: v.is_winner,
              asset_url: v.asset_url,
              created_at: v.created_at
            }
            if (!variantsByTest[v.track_record_id]) {
              variantsByTest[v.track_record_id] = []
            }
            variantsByTest[v.track_record_id].push(variant)
          })
          setVariants(variantsByTest)

          // Fetch metrics for all variants
          const variantIds = variantsData.map(v => v.id)
          if (variantIds.length > 0) {
            const { data: metricsData } = await supabase
              .from('track_record_kpis')
              .select('*')
              .in('variation_id', variantIds)

            if (metricsData) {
              const metricsByVariant: Record<string, Metric[]> = {}
              metricsData.forEach(m => {
                const metric: Metric = {
                  id: m.id,
                  variant_id: m.variation_id,
                  metric_type: m.kpi_name,
                  value: m.kpi_value,
                  unit: m.kpi_unit === 'percentage' ? '%' : m.kpi_unit === 'currency' ? '$' : 'count',
                  sample_size: m.sample_size || 0,
                  updated_at: m.updated_at
                }
                if (!metricsByVariant[m.variation_id]) {
                  metricsByVariant[m.variation_id] = []
                }
                metricsByVariant[m.variation_id].push(metric)
              })
              setMetrics(metricsByVariant)
            }
          }
        }
      }
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to fetch tests')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTest = async (testData: Partial<ABTest>): Promise<ABTest> => {
    const supabase = await getSupabaseClient()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    
    // Usar organização fixa (simples)
    const ORGANIZATION_ID = 'a214d299-3e9f-4b18-842b-c74dc52b5dfc'
    
    // Generate next test ID
    const year = new Date().getFullYear()
    const testTypePrefix = testData.test_type?.substring(0, 3).toUpperCase() || 'TST'
    const { data: countData } = await supabase
      .from('track_records')
      .select('track_record_id')
      .eq('organization_id', ORGANIZATION_ID)
      .like('track_record_id', `${testTypePrefix}-${year}-%`)
    
    const nextNum = (countData?.length || 0) + 1
    const testId = `${testTypePrefix}-${year}-${String(nextNum).padStart(3, '0')}`

    // Insert test data (com organization_id fixo) - sem .single() primeiro
    const { data, error } = await supabase
      .from('track_records')
      .insert({
        organization_id: ORGANIZATION_ID,
        track_record_id: testId,
        hypothesis: testData.hypothesis,
        test_type: testData.test_type,
        channel: testData.channel,
        start_date: testData.start_date || new Date().toISOString().split('T')[0],
        status: 'Em andamento',
        created_by: user.id
      })
      .select()

    if (error) {

      throw error
    }

    if (!data || !Array.isArray(data) || data.length === 0) {

      // Fallback: buscar o teste que acabamos de criar
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('track_records')
        .select()
        .eq('track_record_id', testId)
        .single()

      if (fallbackError || !fallbackData) {
        throw new Error('Test creation failed and could not be retrieved')
      }

      await fetchTests()
      return fallbackData
    }

    const createdTest = data[0]
    
    if (!createdTest.id) {

      throw new Error('Database returned data but no ID field')
    }

    await fetchTests()
    return createdTest
  }

  const updateTest = async (id: string, updates: Partial<ABTest>) => {
    const supabase = await getSupabaseClient()
    
    const { error } = await supabase
      .from('track_records')
      .update({
        hypothesis: updates.hypothesis,
        status: updates.status === 'running' ? 'Em andamento' : 'Finalizado',
        insights: updates.insights,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    await fetchTests()
  }

  const deleteTest = async (id: string) => {
    const supabase = await getSupabaseClient()
    const { error } = await supabase
      .from('track_records')
      .delete()
      .eq('id', id)

    if (error) throw error
    await fetchTests()
  }

  const createVariant = async (variantData: Partial<Variant>): Promise<Variant> => {
    const supabase = await getSupabaseClient()
    
    const { data, error } = await supabase
      .from('track_record_variations')
      .insert({
        track_record_id: variantData.test_id,
        variation_name: variantData.name,
        description: variantData.description
      })
      .select()
      .single()

    if (error) throw error
    
    await fetchTests()
    return data as any
  }

  const updateMetric = async (variantId: string, metric: Partial<Metric>) => {
    const supabase = await getSupabaseClient()
    
    const { error } = await supabase
      .from('track_record_kpis')
      .upsert({
        variation_id: variantId,
        kpi_name: metric.metric_type,
        kpi_value: metric.value,
        kpi_unit: metric.unit === '%' ? 'percentage' : metric.unit === '$' ? 'currency' : 'count',
        sample_size: metric.sample_size,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
    await fetchTests()
  }

  useEffect(() => {
    fetchTests()
  }, [fetchTests])

  // Real-time subscriptions
  useEffect(() => {
    let subscription: any

    async function setupRealtimeSubscription() {
      const supabase = await getSupabaseClient()
      
      subscription = supabase
        .channel('ab-tests-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'track_records' }, fetchTests)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'track_record_variations' }, fetchTests)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'track_record_kpis' }, fetchTests)
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [fetchTests])

  return (
    <ABTestContext.Provider value={{
      tests,
      variants,
      metrics,
      loading,
      error,
      refreshTests: fetchTests,
      createTest,
      updateTest,
      deleteTest,
      createVariant,
      updateMetric
    }}>
      {children}
    </ABTestContext.Provider>
  )
}

export function useABTests() {
  const context = useContext(ABTestContext)
  if (!context) {
    throw new Error('useABTests must be used within ABTestProvider')
  }
  return context
}