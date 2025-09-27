// TIPOS SUPER SIMPLES PARA TESTES A/B
export interface SimpleABTest {
  id: string
  test_id: string
  hypothesis: string
  test_type: 'VSL' | 'Headline' | 'CTA' | 'Landing Page' | 'Creative' | 'Email'
  status: 'running' | 'completed'
  start_date: string
  end_date?: string
  comments?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface SimpleVariant {
  id: string
  test_id: string
  name: string // A, B, C
  description: string
  is_control: boolean
  is_winner: boolean
  created_at: string
}

export interface SimpleMetric {
  id: string
  variant_id: string
  metric_name: 'CTR' | 'CPC' | 'CPA' | 'ROAS' | 'CVR' | 'Conversões'
  metric_value: number
  sample_size: number
  updated_at: string
}

