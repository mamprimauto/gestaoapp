"use client"

import { useState, useEffect } from 'react'
import { Clock, Trophy, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getUserPunctualityProfile,
  getOrganizationPunctualityRanking,
  updatePunctualityMetrics,
  type UserPunctualityProfile,
  formatDelayTime,
  getPunctualityColor,
  getPunctualityIcon,
  MEETING_SCHEDULES
} from '@/lib/punctuality-calculator'

interface PunctualityDashboardProps {
  userId: string
  organizationId: string
  className?: string
}

export default function PunctualityDashboard({
  userId,
  organizationId,
  className
}: PunctualityDashboardProps) {
  const [userProfile, setUserProfile] = useState<UserPunctualityProfile | null>(null)
  const [ranking, setRanking] = useState<UserPunctualityProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const loadData = async () => {
    try {
      setLoading(true)

      // Atualizar métricas primeiro
      await updatePunctualityMetrics(userId, organizationId, 'weekly')
      await updatePunctualityMetrics(userId, organizationId, 'monthly')

      // Carregar dados
      const [profile, orgRanking] = await Promise.all([
        getUserPunctualityProfile(userId, organizationId),
        getOrganizationPunctualityRanking(organizationId, selectedPeriod)
      ])

      setUserProfile(profile)
      setRanking(orgRanking)
    } catch (error) {
      console.error('Erro ao carregar dados de pontualidade:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userId, organizationId, selectedPeriod])

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2 text-white">
          <Clock className="h-5 w-5" />
          <span>Carregando dados de pontualidade...</span>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado de pontualidade encontrado.</p>
              <p className="text-sm mt-2">
                Os dados serão gerados automaticamente quando participar das dailys.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentMetrics = selectedPeriod === 'weekly'
    ? userProfile.current_week_metrics
    : userProfile.current_month_metrics

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">Pontualidade</h2>
            <p className="text-sm text-gray-500">
              Acompanhe seu desempenho nas dailys
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'weekly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedPeriod('weekly')}
            className="text-white"
          >
            Semanal
          </Button>
          <Button
            variant={selectedPeriod === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedPeriod('monthly')}
            className="text-white"
          >
            Mensal
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Geral */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Score Geral</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-white">
                    {userProfile.overall_score}
                  </span>
                  <span className="text-lg">{getPunctualityIcon(userProfile.overall_score)}</span>
                </div>
              </div>
              {userProfile.punctuality_trend !== 'stable' && (
                <div className="flex items-center gap-1">
                  {userProfile.punctuality_trend === 'improving' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Pontualidade */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-500">Taxa de Pontualidade</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-2xl font-bold ${getPunctualityColor(currentMetrics.overall_punctuality_rate)}`}>
                  {currentMetrics.overall_punctuality_rate.toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {currentMetrics.copy_gestor_attended_meetings + currentMetrics.editores_attended_meetings} reuniões
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Atraso Médio */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-500">Atraso Médio</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-white">
                  {formatDelayTime(Math.round(currentMetrics.overall_avg_delay_minutes))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes por Tipo de Reunião */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Copy/Gestor */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Copy/Gestor</CardTitle>
            <p className="text-sm text-gray-500">Segunda a Sexta, 14h</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Pontualidade</span>
              <span className={`font-bold ${getPunctualityColor(currentMetrics.copy_gestor_punctuality_rate)}`}>
                {currentMetrics.copy_gestor_punctuality_rate.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Participação</span>
              <span className="text-white">
                {currentMetrics.copy_gestor_attended_meetings}/{currentMetrics.copy_gestor_total_meetings}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Atraso Médio</span>
              <span className="text-white">
                {formatDelayTime(Math.round(currentMetrics.copy_gestor_avg_delay_minutes))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Editores */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Editores</CardTitle>
            <p className="text-sm text-gray-500">Quarta-feira, 14h</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Pontualidade</span>
              <span className={`font-bold ${getPunctualityColor(currentMetrics.editores_punctuality_rate)}`}>
                {currentMetrics.editores_punctuality_rate.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Participação</span>
              <span className="text-white">
                {currentMetrics.editores_attended_meetings}/{currentMetrics.editores_total_meetings}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Atraso Médio</span>
              <span className="text-white">
                {formatDelayTime(Math.round(currentMetrics.editores_avg_delay_minutes))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico Recente */}
      {userProfile.recent_records.length > 0 && (
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardHeader>
            <CardTitle className="text-white text-lg">Histórico Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userProfile.recent_records.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b border-[#1A1A1A] last:border-b-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {new Date(record.meeting_date).toLocaleDateString('pt-BR')}
                    </span>
                    <Badge
                      variant={record.meeting_type === 'copy_gestor' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {record.meeting_type === 'copy_gestor' ? 'Copy/Gestor' : 'Editores'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.is_present ? (
                      <>
                        <span className={`text-sm ${record.is_on_time ? 'text-green-500' : 'text-red-500'}`}>
                          {formatDelayTime(record.delay_minutes)}
                        </span>
                        <span>{record.is_on_time ? '✅' : '⏰'}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Ausente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking da Organização */}
      {ranking.length > 1 && (
        <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking de Pontualidade
            </CardTitle>
            <p className="text-sm text-gray-500">
              Classificação {selectedPeriod === 'weekly' ? 'semanal' : 'mensal'} da equipe
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ranking.slice(0, 10).map((profile, index) => (
                <div
                  key={profile.user_id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    profile.user_id === userId ? 'bg-[#1A1A1A] border border-[#2A2A2A]' : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-500 w-6">
                      #{index + 1}
                    </span>
                    {profile.user_avatar && (
                      <img
                        src={profile.user_avatar}
                        alt={profile.user_name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className={`font-medium ${profile.user_id === userId ? 'text-white' : 'text-gray-300'}`}>
                      {profile.user_name}
                      {profile.user_id === userId && ' (Você)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${getPunctualityColor(profile.overall_score)}`}>
                      {profile.overall_score}
                    </span>
                    <span>{getPunctualityIcon(profile.overall_score)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre Cálculo */}
      <Card className="bg-[#0A0A0A] border-[#1A1A1A]">
        <CardContent className="p-4">
          <div className="text-sm text-gray-500 space-y-1">
            <p><strong>Como funciona:</strong></p>
            <p>• Considera-se pontual quem chega até 5 minutos após o horário</p>
            <p>• Daily Copy/Gestor: Segunda a Sexta às 14h</p>
            <p>• Daily Editores: Quarta-feira às 14h</p>
            <p>• Dados calculados automaticamente com base na participação nas reuniões</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}