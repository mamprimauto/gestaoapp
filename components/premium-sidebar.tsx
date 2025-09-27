"use client"

import { useEffect, useState, memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  Users, 
  Palette, 
  Trophy, 
  Lock, 
  Kanban,
  Shield,
  User,
  Library,
  BookOpen,
  Bug,
  DollarSign,
  Calendar,
  FolderOpen,
} from "lucide-react"
import { useTaskData } from "./task-data"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import DollarQuote from "./dollar-quote"
import { BugReportModal } from "./bug-report-modal"

const menuItems = [
  { 
    title: "Início", 
    icon: Home, 
    url: "/"
  },
  { 
    title: "Track Record", 
    icon: Calendar, 
    url: "/track-record"
  },
  { 
    title: "Cultura", 
    icon: BookOpen, 
    url: "/cultura"
  },
  {
    title: "Testes A/B",
    icon: Trophy,
    url: "/testes"
  },
  { 
    title: "Vault", 
    icon: Lock, 
    url: "/vault"
  },
  { 
    title: "Materiais", 
    icon: Palette, 
    url: "/materiais"
  },
  { 
    title: "Cursos", 
    icon: BookOpen, 
    url: "/cursos"
  },
  { 
    title: "Pesquisa & Inteligência", 
    icon: Library, 
    url: "/swipe-file"
  },
  { 
    title: "Administrativo", 
    icon: Users, 
    url: "/equipe"
  },
  { 
    title: "Financeiro", 
    icon: DollarSign, 
    url: "/financeiro-interno",
    adminOnly: true
  },
]

// Função auxiliar para obter cor e label do departamento
function getDepartmentInfo(role: string | null) {
  const r = String(role || "").toLowerCase()
  
  if (r === "admin") return { 
    label: "Administrador", 
    color: "bg-gradient-to-r from-blue-500 to-blue-600",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/50"
  }
  if (r === "copywriter") return { 
    label: "Copywriter", 
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/50"
  }
  if (r === "gestor_trafego" || r === "gestor-de-trafego" || r === "gestor_tráfico") return { 
    label: "Gestor de Tráfego", 
    color: "bg-gradient-to-r from-green-500 to-emerald-500",
    textColor: "text-green-400",
    borderColor: "border-green-500/50"
  }
  if (r === "minerador") return { 
    label: "Minerador", 
    color: "bg-gradient-to-r from-gray-500 to-slate-500",
    textColor: "text-gray-400",
    borderColor: "border-gray-500/50"
  }
  return { 
    label: "Editor", 
    color: "bg-gradient-to-r from-blue-500 to-cyan-500",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/50"
  }
}

interface UserProfile {
  id: string
  email: string
  name: string | null
  full_name: string | null
  role: string | null
  avatar_url: string | null
  approved: boolean | null
}

function PremiumSidebar() {
  const pathname = usePathname()
  const { tasks, loading } = useTaskData()
  const [userId, setUserId] = useState<string | null>(null)
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showBugReport, setShowBugReport] = useState(false)

  // Obter userId diretamente da autenticação
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error && error.name !== 'AuthSessionMissingError') {

        }
        
        const uid = user?.id ?? null
        setUserId(uid)
      } catch (error) {

      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    async function fetchUserInfo() {
      if (!userId) {
        setProfileLoading(false)
        return
      }
      try {
        const supabase = await getSupabaseClient()
        
        // Buscar perfil completo do usuário
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("id, email, name, full_name, role, avatar_url, approved")
          .eq("id", userId)
          .single()
        
        if (error) {
          setProfileLoading(false)
          return
        }
        
        // Lidar com array ou objeto
        const profile = Array.isArray(profileData) ? profileData[0] : profileData
        
        if (profile) {
          setUserProfile(profile as UserProfile)
          
          if ((profile.role === 'admin' || profile.role === 'administrador') && profile.approved) {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
          }
        }
        // Buscar org info (código original)
        const { data: orgData } = await supabase
          .from("organization_members")
          .select("organization_id, organizations(id, name)")
          .eq("user_id", userId)
          .single()
        if (orgData?.organizations) {
          setOrgInfo(orgData.organizations as any)
        }
      } catch (error) {

      } finally {
        setProfileLoading(false)
      }
    }
    
    if (userId) {
      fetchUserInfo()
    }
  }, [userId])

  // Escutar mudanças no perfil (para quando o avatar for atualizado)
  useEffect(() => {
    if (!userId) return

    async function setupRealtimeSubscription() {
      try {
        const supabase = await getSupabaseClient()
        
        const channel = supabase
          .channel('profile-changes')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
          }, (payload) => {
            const newProfile = payload.new as UserProfile
            setUserProfile(newProfile)
            
            if ((newProfile.role === 'admin' || newProfile.role === 'administrador') && newProfile.approved) {
              setIsAdmin(true)
            } else {
              setIsAdmin(false)
            }
          })
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {

      }
    }

    const cleanup = setupRealtimeSubscription()
    return () => cleanup?.then(fn => fn?.())
  }, [userId])


  return (
    <>
      {/* Premium Sidebar */}
      <aside 
        className="fixed left-0 top-0 z-[100] h-screen w-56 md:w-64 lg:w-72"
        style={{
          background: '#1a1a1a',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}
      >
        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-800/50">
          {profileLoading ? (
            // Loading skeleton
            <div className="flex flex-col items-center justify-center space-y-3">
              <Skeleton className="h-20 w-20 rounded-full bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-gray-700 mx-auto" />
                <Skeleton className="h-3 w-24 bg-gray-700 mx-auto" />
              </div>
            </div>
          ) : userProfile ? (
            // Profile loaded
            <div className="flex flex-col items-center justify-center space-y-3">
              {/* Avatar */}
              <Link href="/perfil" className="relative group cursor-pointer">
                <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-gray-700 bg-gray-800 transform transition-transform group-hover:scale-105">
                  {userProfile.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={userProfile.name || userProfile.email}
                      className="h-20 w-20 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-20 w-20 flex items-center justify-center bg-gray-700">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-green-500 rounded-full ring-2 ring-gray-900"></div>
              </Link>

              {/* Nome e Função */}
              <div className="text-center space-y-1">
                <h3 className="text-white font-medium text-sm">
                  {userProfile.full_name || userProfile.name || 'Usuário'}
                </h3>
                <p className="text-gray-400 text-xs">
                  {getDepartmentInfo(userProfile.role).label}
                </p>
              </div>
            </div>
          ) : (
            // No profile
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-20 w-20 rounded-full bg-gray-800 flex items-center justify-center">
                <User className="h-10 w-10 text-gray-500" />
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-sm">Não conectado</div>
              </div>
            </div>
          )}
          
          {/* Dollar Quote Component */}
          <DollarQuote />
        </div>

        {/* Header Navigation Label */}
        <div className="px-3 py-2 lg:px-4 border-b border-gray-800/30">
          <div className="text-xs text-gray-500 font-bold tracking-wider">
            MENU PRINCIPAL {isAdmin && '👑'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-2 lg:p-4 flex-1 overflow-y-auto">
          <div className="space-y-1 lg:space-y-2">
            {menuItems
              .filter(item => {
                // Mostrar Equipe e Financeiro apenas para admins
                if (item.url === '/equipe' || item.adminOnly) {
                  return isAdmin
                }
                return true
              })
              .map((item, index) => {
              const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url + "/"))
              const IconComponent = item.icon
              
              return (
                <div key={item.url} className="premium-menu-item" style={{ animationDelay: `${index * 50}ms` }}>
                  <Link
                    href={item.url}
                    className={`
                      group relative flex items-center px-2 py-1.5 md:px-3 md:py-2 lg:px-4 lg:py-3 rounded-xl space-x-1.5 md:space-x-2 lg:space-x-3
                      transition-all duration-300 ease-out
                      ${isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-white hover:text-blue-300 hover:bg-gray-700'
                      }
                      hover:scale-[1.02] hover:shadow-lg hover:shadow-white/10
                    `}
                  >
                    <div className={`
                      flex items-center justify-center w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 flex-shrink-0
                      ${isActive ? 'text-blue-400' : 'text-white group-hover:text-blue-300'}
                      transition-colors duration-200
                    `}>
                      <IconComponent className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.title}
                      </div>
                    </div>

                  </Link>
                </div>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-2 lg:p-4 border-t border-gray-800">
          <button
            onClick={() => setShowBugReport(true)}
            className="w-full mb-2 lg:mb-4 px-2 py-1 lg:px-3 lg:py-2 rounded-lg border-none bg-transparent
                     text-white/80 hover:text-white hover:bg-white/10
                     transition-all duration-200
                     flex items-center space-x-2"
          >
            <Bug size={14} />
            <span className="text-xs">Reportar Bug</span>
          </button>

          <div className="space-y-1 lg:space-y-2 text-xs">
            {orgInfo && (
              <div className="text-blue-400/80 font-mono truncate text-xs">
                Org: {orgInfo.name}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Bug Report Modal */}
      <BugReportModal
        open={showBugReport}
        onOpenChange={setShowBugReport}
      />

    </>
  )
}

export default memo(PremiumSidebar)