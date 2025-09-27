"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { SimpleABTest, SimpleVariant, SimpleMetric } from '@/lib/simple-ab-tests'

interface SimpleABTestContextType {
  tests: SimpleABTest[]
  loading: boolean
  error: string | null
  createTest: (test: Partial<SimpleABTest>) => Promise<SimpleABTest>
  updateTest: (testId: string, updates: Partial<SimpleABTest>) => Promise<void>
  deleteTest: (testId: string) => Promise<void>
  refreshTests: () => Promise<void>
}

const SimpleABTestContext = createContext<SimpleABTestContextType | undefined>(undefined)

export function SimpleABTestProvider({ children }: { children: React.ReactNode }) {
  const [tests, setTests] = useState<SimpleABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = await getSupabaseClient()
      
      // Buscar todos os testes
      const { data: testsData, error: testsError } = await supabase
        .from('ab_tests')
        .select('*')
        .order('created_at', { ascending: false })

      if (testsError) throw testsError

      const mappedTests: SimpleABTest[] = (testsData || []).map(test => ({
        id: test.id.toString(),
        test_id: test.name,
        hypothesis: test.hypothesis || '',
        test_type: test.test_type || 'VSL',
        status: test.status,
        start_date: test.start_date || test.created_at?.split('T')[0] || '',
        end_date: test.end_date || undefined,
        comments: test.comments || '',
        created_by: 'user',
        created_at: test.created_at,
        updated_at: test.created_at
      }))

      setTests(mappedTests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tests')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTest = async (testData: Partial<SimpleABTest>): Promise<SimpleABTest> => {
    const supabase = await getSupabaseClient()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // PRIMEIRO: Verificar se tabela existe
    const { data: tableCheck, error: tableError } = await supabase
      .from('ab_tests')
      .select('id')
      .limit(1)
    
    if (tableError) {
      throw new Error('Tabela ab_tests não encontrada. Execute o SQL ULTRA_SIMPLES.sql primeiro.')
    }
    
    // Generate test ID manually (mais simples)
    const year = new Date().getFullYear()
    const testTypePrefix = testData.test_type?.substring(0, 3).toUpperCase() || 'TST'
    
    // Buscar próximo número
    const { data: existingTests } = await supabase
      .from('ab_tests')
      .select('id')
      .like('name', `${testTypePrefix}-${year}-%`)
    
    const nextNum = (existingTests?.length || 0) + 1
    const testId = `${testTypePrefix}-${year}-${String(nextNum).padStart(3, '0')}`

    // Insert test SEM SELECT (abordagem mais simples)
    const { error: insertError } = await supabase
      .from('ab_tests')
      .insert({
        name: testId,
        hypothesis: testData.hypothesis,
        test_type: testData.test_type,
        status: testData.status || 'running',
        start_date: testData.start_date || new Date().toISOString().split('T')[0],
        end_date: testData.end_date || null,
        comments: testData.comments || ''
      })

    if (insertError) {
      throw insertError
    }

    // Agora buscar o registro criado separadamente
    const { data: createdData, error: selectError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('name', testId)
      .single()

    if (selectError) {
      throw new Error('Teste criado mas não pode ser recuperado: ' + selectError.message)
    }

    if (!createdData) {
      throw new Error('Teste criado mas não encontrado')
    }

    // Tratar tanto array quanto objeto
    const createdTest = Array.isArray(createdData) ? createdData[0] : createdData
    
    if (!createdTest || !createdTest.id) {
      throw new Error('Test created but no ID returned')
    }
    
    await fetchTests()
    return createdTest
  }

  const updateTest = async (testId: string, updates: Partial<SimpleABTest>) => {
    const supabase = await getSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error: updateError } = await supabase
      .from('ab_tests')
      .update({
        hypothesis: updates.hypothesis,
        test_type: updates.test_type,
        status: updates.status,
        start_date: updates.start_date,
        end_date: updates.end_date,
        comments: updates.comments
      })
      .eq('id', testId)

    if (updateError) {
      throw updateError
    }
    await fetchTests()
  }

  const deleteTest = async (testId: string) => {
    const supabase = await getSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get the session token to send to API
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session available')

    const response = await fetch(`/api/ab-tests/${testId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete test')
    }

    await fetchTests()
  }

  useEffect(() => {
    fetchTests()
  }, [fetchTests])

  return (
    <SimpleABTestContext.Provider value={{
      tests,
      loading,
      error,
      createTest,
      updateTest,
      deleteTest,
      refreshTests: fetchTests
    }}>
      {children}
    </SimpleABTestContext.Provider>
  )
}

export function useSimpleABTests() {
  const context = useContext(SimpleABTestContext)
  if (!context) {
    throw new Error('useSimpleABTests must be used within SimpleABTestProvider')
  }
  return context
}