"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Loader2, Link2, Hash, MessageSquare, Tag, Star, TrendingUp } from "lucide-react"
import UniversalComments from "./universal-comments"

interface SwipeFile {
  id: string
  name: string
  niche: string
  ads_count: number
  link: string
  is_active: boolean
  is_tracking?: boolean
  is_scaling?: boolean
  created_at: string
  updated_at: string
  user_id?: string
}

interface TrackingStats {
  total_days: number
  total_ads: number
  average_per_day: number
  last_tracked?: string
  dates: { date: string; ads_count: number }[]
}

interface SwipeFileDetailsModalProps {
  file: SwipeFile | null
  open: boolean
  onClose: () => void
  onAfterSave?: () => void
  hasInsider?: boolean
  onToggleInsider?: (fileId: string) => void
}

const nicheColors: Record<string, string> = {
  "Disfunção Erétil (ED)": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Emagrecimento": "bg-green-500/20 text-green-400 border-green-500/30",
  "Finanças": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Beleza": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Saúde": "bg-red-500/20 text-red-400 border-red-500/30",
  "Fitness": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Relacionamento": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Educação": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Tecnologia": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Marketing": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Outros": "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export default function SwipeFileDetailsModal({ 
  file, 
  open, 
  onClose,
  onAfterSave,
  hasInsider = false,
  onToggleInsider 
}: SwipeFileDetailsModalProps) {
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [trackingStats, setTrackingStats] = useState<TrackingStats | null>(null)
  const [commentsCount, setCommentsCount] = useState(0)
  const [loadingStats, setLoadingStats] = useState(false)

  // Load tracking statistics
  const loadTrackingStats = async () => {
    if (!file || !file.is_tracking) return
    
    setLoadingStats(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from("swipe_file_tracking")
        .select("*")
        .eq("swipe_file_id", file.id)
        .order("date", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        const totalAds = data.reduce((sum, d) => sum + (d.ads_count || 0), 0)
        const stats: TrackingStats = {
          total_days: data.length,
          total_ads: totalAds,
          average_per_day: Math.round(totalAds / data.length),
          last_tracked: data[data.length - 1]?.date,
          dates: data.map(d => ({ date: d.date, ads_count: d.ads_count || 0 }))
        }
        setTrackingStats(stats)
      } else {
        setTrackingStats(null)
      }
    } catch (error) {

      setTrackingStats(null)
    } finally {
      setLoadingStats(false)
    }
  }

  // Load comments count
  const loadCommentsCount = async () => {
    if (!file) return
    
    try {
      const supabase = await getSupabaseClient()
      
      const { count, error } = await supabase
        .from("swipe_file_comments")
        .select("*", { count: 'exact', head: true })
        .eq("swipe_file_id", file.id)

      if (error) throw error

      setCommentsCount(count || 0)
    } catch (error) {

      setCommentsCount(0)
    }
  }

  // Load data when modal opens
  useEffect(() => {
    if (file && open) {
      setIsModalLoading(true)
      Promise.all([
        loadTrackingStats(),
        loadCommentsCount()
      ]).finally(() => {
        setIsModalLoading(false)
      })
    }
  }, [file, open])

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[90vh] bg-[#1C1C1E] text-[#F2F2F7] border border-[#2A2A2C] rounded-xl p-0 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2E2E30]">
          <DialogHeader>
            <DialogTitle className="text-[#F2F2F7] flex items-center gap-2 text-[15px]">
              <Tag className="h-4 w-4 text-white/70" />
              Detalhes da Biblioteca
            </DialogTitle>
            <DialogDescription className="text-white/65 text-[12px]">
              Visualize informações detalhadas e acompanhe os comentários da biblioteca de anúncios.
            </DialogDescription>
          </DialogHeader>
        </div>

        {isModalLoading ? (
          <div className="flex-1 grid place-items-center py-10 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin mr-2 inline" />
            Carregando...
          </div>
        ) : (
          <>
            {/* Main Content - Two Column Layout with Scroll */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-[#1E1E20] scrollbar-thumb-[#3A3A3C] hover:scrollbar-thumb-[#4A4A4C]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 p-3 lg:p-4 min-h-full">
                  
                  {/* Left Column - Library Information */}
                  <div className="space-y-4">
                    
                    {/* Basic Information Card */}
                    <div className="bg-[#1E1E20] border border-[#2E2E30] rounded-lg shadow-sm">
                      {/* Card Header */}
                      <div className="bg-[#1A1A1C] border-b border-[#2A2A2C] px-3 py-2 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full"></div>
                          <h3 className="text-[12px] font-medium text-white/90">Informações da Biblioteca</h3>
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-3 space-y-3">
                        {/* Name */}
                        <div>
                          <label className="text-[10px] text-white/50 mb-1 block">Nome</label>
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-medium text-white">{file.name}</p>
                            {file.is_scaling && (
                              <Badge 
                                variant="outline" 
                                className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0.5 flex items-center gap-1"
                              >
                                <TrendingUp className="h-3 w-3" />
                                ESCALANDO
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Grid Layout for Info Items */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Niche */}
                          <div>
                            <label className="text-[10px] text-white/50 mb-1.5 block">Nicho</label>
                            <Badge 
                              variant="outline" 
                              className={`${nicheColors[file.niche] || nicheColors["Outros"]} text-xs`}
                            >
                              {file.niche}
                            </Badge>
                          </div>

                          {/* Ads Count */}
                          <div>
                            <label className="text-[10px] text-white/50 mb-1.5 block">Total de Anúncios</label>
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5 text-white/40" />
                              <span className="text-[14px] font-semibold text-white">
                                {file.ads_count.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="text-[10px] text-white/50 mb-1.5 block">Status</label>
                            <Badge 
                              className={`text-xs ${
                                file.is_tracking 
                                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              }`}
                            >
                              {file.is_tracking ? "Rastreando" : "Não rastreado"}
                            </Badge>
                          </div>
                        </div>

                        {/* Link and Insider */}
                        <div className="pt-2 border-t border-[#2A2A2C] space-y-3">
                          <div>
                            <label className="text-[10px] text-white/50 mb-1.5 block">Link da Biblioteca</label>
                            <a
                              href={file.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-[#2A2A2C] hover:bg-[#3A3A3C] rounded-md transition-colors group"
                            >
                              <Link2 className="h-4 w-4 text-[#007AFF] group-hover:text-[#0A84FF]" />
                              <span className="text-sm text-[#007AFF] group-hover:text-[#0A84FF] font-medium">
                                Abrir biblioteca externa
                              </span>
                            </a>
                          </div>
                          
                          {/* Insider Toggle */}
                          <div>
                            <label className="text-[10px] text-white/50 mb-1.5 block">Solicitar Insider</label>
                            <Button
                              onClick={() => onToggleInsider?.(file.id)}
                              variant="outline"
                              className={`gap-2 ${
                                hasInsider
                                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/50'
                                  : 'bg-[#2A2A2C] border-[#3A3A3C] text-white/70 hover:bg-[#3A3A3C] hover:text-white'
                              }`}
                            >
                              <Star className={`h-4 w-4 ${hasInsider ? 'fill-yellow-400' : ''}`} />
                              {hasInsider ? 'Insider Solicitado' : 'Solicitar Insider'}
                            </Button>
                            {hasInsider && (
                              <p className="text-[10px] text-yellow-400/70 mt-1">
                                Você solicitou acesso insider para esta biblioteca
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column - Comments */}
                  <div className="lg:border-l lg:border-[#2E2E30] lg:pl-4 border-t border-[#2E2E30] pt-4 lg:border-t-0 lg:pt-0">
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg h-full flex flex-col">
                      {/* Comments Header */}
                      <div className="bg-[#1A1A1C] border-b border-[#2A2A2C] px-3 py-2 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-white/70" />
                          <span className="text-[12px] font-medium text-white/90">Comentários</span>
                          {commentsCount > 0 && (
                            <span className="text-[10px] text-white/50">({commentsCount})</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Comments Content */}
                      <div className="flex-1 min-h-[400px] max-h-[600px] overflow-hidden p-3">
                        <UniversalComments 
                          entityId={file.id}
                          entityType="swipe-file"
                          onCommentChange={() => {
                            void loadCommentsCount()
                            onAfterSave?.()
                          }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="shrink-0 px-3 lg:px-4 py-3 border-t border-[#2E2E30] bg-[#1C1C1E]">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="h-9 px-4 text-white/80 hover:bg-white/5 rounded-md"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}