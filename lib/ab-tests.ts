// Types for A/B Testing System
export interface ABTest {
  id: string
  organization_id: string
  test_id: string // VSL-2025-001
  name: string
  hypothesis: string
  test_type: 'VSL' | 'Headline' | 'CTA' | 'Landing Page' | 'Ad Copy' | 'Creative' | 'Email'
  channel: 'Facebook Ads' | 'YouTube' | 'Google Ads' | 'TikTok' | 'Instagram' | 'Email' | 'Organic'
  status: 'draft' | 'running' | 'paused' | 'completed'
  start_date: string
  end_date?: string
  sample_size?: number
  confidence_level: number // 90, 95, 99
  created_at: string
  updated_at: string
  created_by: string
  winner_variant?: string
  insights?: string
}

export interface Variant {
  id: string
  test_id: string
  name: string // A, B, C
  description: string
  is_control: boolean
  is_winner: boolean
  asset_url?: string
  created_at: string
}

export interface Metric {
  id: string
  variant_id: string
  metric_type: 'CTR' | 'CPC' | 'CPA' | 'ROAS' | 'CVR' | 'CPM' | 'Conversions'
  value: number
  unit: '%' | '$' | 'count'
  sample_size: number
  confidence_interval?: [number, number]
  updated_at: string
}

export interface TestResult {
  test_id: string
  variants: Array<{
    variant: Variant
    metrics: Metric[]
    performance_score: number
    is_significant: boolean
    confidence: number
  }>
  winner?: {
    variant_id: string
    improvement: number
    confidence: number
  }
  recommendation: string
}

// Helper functions
export function calculateSignificance(
  controlMetric: Metric,
  variantMetric: Metric,
  confidenceLevel: number = 95
): {
  isSignificant: boolean
  pValue: number
  confidence: number
} {
  // Simplified statistical significance calculation
  // In production, use proper statistical library
  const controlRate = controlMetric.value / 100
  const variantRate = variantMetric.value / 100
  const controlSize = controlMetric.sample_size
  const variantSize = variantMetric.sample_size
  
  const pooledRate = (controlRate * controlSize + variantRate * variantSize) / (controlSize + variantSize)
  const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlSize + 1/variantSize))
  const zScore = (variantRate - controlRate) / standardError
  
  // Simplified p-value calculation
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))
  const confidence = (1 - pValue) * 100
  
  return {
    isSignificant: confidence >= confidenceLevel,
    pValue,
    confidence
  }
}

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

export function formatTestId(type: string, year: number, sequence: number): string {
  return `${type}-${year}-${String(sequence).padStart(3, '0')}`
}

export function getTestStatusColor(status: ABTest['status']): string {
  const colors = {
    draft: 'text-gray-500',
    running: 'text-blue-500',
    paused: 'text-yellow-500',
    completed: 'text-green-500'
  }
  return colors[status]
}

export function getTestStatusIcon(status: ABTest['status']): string {
  const icons = {
    draft: '📝',
    running: '🚀',
    paused: '⏸️',
    completed: '✅'
  }
  return icons[status]
}

export function calculateImprovement(control: number, variant: number): number {
  if (control === 0) return 0
  return ((variant - control) / control) * 100
}

export function formatMetricValue(value: number, unit: Metric['unit']): string {
  switch (unit) {
    case '%':
      return `${value.toFixed(2)}%`
    case '$':
      return `$${value.toFixed(2)}`
    case 'count':
      return value.toLocaleString()
    default:
      return value.toString()
  }
}