"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useTaskData } from './task-data'
import {
  TrackRecord,
  TrackRecordFilters,
  CreateTrackRecordData,
  UpdateTrackRecordData,
  getTrackRecords,
  createTrackRecord,
  updateTrackRecord,
  getTrackRecordWithDetails
} from '@/lib/track-record'
import { getSupabaseClient } from '@/lib/supabase/client'

interface TeamMember {
  id: string
  full_name: string
  avatar_url?: string
  email?: string
}

interface TrackRecordContextData {
  trackRecords: TrackRecord[]
  loading: boolean
  filters: TrackRecordFilters
  teamMembers: TeamMember[]
  setFilters: (filters: TrackRecordFilters) => void
  refreshTrackRecords: () => Promise<void>
  createNewTrackRecord: (data: CreateTrackRecordData) => Promise<TrackRecord>
  updateExistingTrackRecord: (id: string, data: UpdateTrackRecordData) => Promise<void>
  getTrackRecordDetails: (id: string) => Promise<{
    trackRecord: TrackRecord
    variations: any[]
    kpis: { [variationId: string]: any[] }
  } | null>
}

const TrackRecordContext = createContext<TrackRecordContextData | null>(null)

export function useTrackRecordData() {
  const context = useContext(TrackRecordContext)
  if (!context) {
    throw new Error('useTrackRecordData must be used within a TrackRecordProvider')
  }
  return context
}

interface TrackRecordProviderProps {
  children: React.ReactNode
}

export function TrackRecordProvider({ children }: TrackRecordProviderProps) {
  const { userId, userOrgId } = useTaskData()
  const [trackRecords, setTrackRecords] = useState<TrackRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TrackRecordFilters>({})
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const refreshTrackRecords = useCallback(async () => {
    if (!userOrgId) return
    
    setLoading(true)
    try {
      const data = await getTrackRecords(userOrgId, filters)
      setTrackRecords(data)
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }, [userOrgId, filters])

  const createNewTrackRecord = useCallback(async (data: CreateTrackRecordData): Promise<TrackRecord> => {
    if (!userOrgId || !userId) {
      throw new Error('Organization ID and User ID are required')
    }
    
    const newTrackRecord = await createTrackRecord(data, userOrgId, userId)
    await refreshTrackRecords()
    return newTrackRecord
  }, [userOrgId, userId, refreshTrackRecords])

  const updateExistingTrackRecord = useCallback(async (id: string, data: UpdateTrackRecordData): Promise<void> => {
    await updateTrackRecord(id, data)
    await refreshTrackRecords()
  }, [refreshTrackRecords])

  const getTrackRecordDetails = useCallback(async (id: string) => {
    return await getTrackRecordWithDetails(id)
  }, [])

  const loadTeamMembers = useCallback(async () => {
    if (!userOrgId) return

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('organization_id', userOrgId)
        .order('full_name', { ascending: true })

      if (error) {

        return
      }

      setTeamMembers(data || [])
    } catch (error) {

    }
  }, [userOrgId])

  // Load track records when user org changes or filters change
  useEffect(() => {
    if (userOrgId) {
      refreshTrackRecords()
    }
  }, [userOrgId, refreshTrackRecords])

  // Load team members when user org changes
  useEffect(() => {
    if (userOrgId) {
      loadTeamMembers()
    }
  }, [userOrgId, loadTeamMembers])

  const contextValue: TrackRecordContextData = {
    trackRecords,
    loading,
    filters,
    teamMembers,
    setFilters,
    refreshTrackRecords,
    createNewTrackRecord,
    updateExistingTrackRecord,
    getTrackRecordDetails
  }

  return (
    <TrackRecordContext.Provider value={contextValue}>
      {children}
    </TrackRecordContext.Provider>
  )
}