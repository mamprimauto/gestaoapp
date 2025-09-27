"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { 
  User,
  Users as UsersIcon,
  Check, 
  X, 
  Shield, 
  Edit2, 
  Trash2,
  Mail,
  Calendar,
  UserCheck,
  UserX,
  Search,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import UserProfileModal from "@/components/user-profile-modal"

interface UserProfile {
  id: string
  email: string
  name: string | null
  full_name: string | null
  role: string | null
  avatar_url: string | null
  approved: boolean | null
  created_at: string
  updated_at: string
}

export default function UserAdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [approvalFilter, setApprovalFilter] = useState("all")
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {

        return
      }

      setUsers(data || [])
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId)

      if (error) {

        return
      }

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
    } catch (error) {

    }
  }

  const toggleUserApproval = async (userId: string, approved: boolean) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from("profiles")
        .update({ approved })
        .eq("id", userId)

      if (error) {

        return
      }

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, approved } : user
      ))
    } catch (error) {

    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return

    try {
      const supabase = await getSupabaseClient()
      
      // Delete from auth.users (this will cascade to profiles)
      const { error } = await supabase.auth.admin.deleteUser(userId)

      if (error) {
        // If admin API fails, try deleting just from profiles
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", userId)

        if (profileError) {

          return
        }
      }

      setUsers(prev => prev.filter(user => user.id !== userId))
    } catch (error) {

    }
  }

  const saveUserChanges = async () => {
    if (!editingUser) return

    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editingUser.name,
          full_name: editingUser.full_name,
          role: editingUser.role,
          approved: editingUser.approved
        })
        .eq("id", editingUser.id)

      if (error) {

        return
      }

      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? editingUser : user
      ))
      setIsEditDialogOpen(false)
      setEditingUser(null)
    } catch (error) {

    }
  }

  const getRoleBadge = (role: string | null) => {
    const roleConfig: Record<string, { label: string; className: string }> = {
      admin: { label: "Admin", className: "bg-red-500/20 text-red-400 border-red-500/50" },
      copywriter: { label: "Copywriter", className: "bg-purple-500/20 text-purple-400 border-purple-500/50" },
      editor: { label: "Editor", className: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
      gestor_trafego: { label: "Gestor", className: "bg-green-500/20 text-green-400 border-green-500/50" },
      minerador: { label: "Minerador", className: "bg-gray-500/20 text-gray-400 border-gray-500/50" }
    }

    const config = roleConfig[role || ""] || { label: role || "Sem cargo", className: "bg-gray-500/20 text-gray-400" }
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesApproval = 
      approvalFilter === "all" || 
      (approvalFilter === "approved" && user.approved) ||
      (approvalFilter === "pending" && !user.approved)

    return matchesSearch && matchesRole && matchesApproval
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Carregando usuários...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900/50 border-gray-600"
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="bg-gray-900/50 border-gray-600">
              <SelectValue placeholder="Filtrar por cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cargos</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="copywriter">Copywriter</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="gestor_trafego">Gestor de Tráfego</SelectItem>
              <SelectItem value="minerador">Minerador</SelectItem>
            </SelectContent>
          </Select>

          <Select value={approvalFilter} onValueChange={setApprovalFilter}>
            <SelectTrigger className="bg-gray-900/50 border-gray-600">
              <SelectValue placeholder="Status de aprovação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <UsersIcon className="h-4 w-4" />
            <span>{filteredUsers.length} usuários</span>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Cadastro
                </th>
                <th className="text-right p-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name || user.email}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            setSelectedUserId(user.id)
                            setProfileModalOpen(true)
                          }}
                          className="text-left hover:text-blue-400 transition-colors"
                        >
                          <div className="font-medium text-white hover:text-blue-400">
                            {user.full_name || user.name || "Sem nome"}
                          </div>
                        </button>
                        <div className="text-sm text-gray-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {user.approved ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Aprovado
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                          <UserX className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserApproval(user.id, !user.approved)}
                        className="hover:bg-gray-700"
                      >
                        {user.approved ? (
                          <X className="h-4 w-4 text-red-400" />
                        ) : (
                          <Check className="h-4 w-4 text-green-400" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user)
                          setIsEditDialogOpen(true)
                        }}
                        className="hover:bg-gray-700"
                      >
                        <Edit2 className="h-4 w-4 text-blue-400" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        className="hover:bg-gray-700"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editingUser.name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={editingUser.full_name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <Label>Cargo</Label>
                <Select 
                  value={editingUser.role || ""} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="copywriter">Copywriter</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="gestor_trafego">Gestor de Tráfego</SelectItem>
                    <SelectItem value="minerador">Minerador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingUser.approved || false}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, approved: checked })}
                />
                <Label>Usuário Aprovado</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="bg-gray-800 border-gray-700"
            >
              Cancelar
            </Button>
            <Button onClick={saveUserChanges} className="bg-blue-600 hover:bg-blue-700">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Profile Modal */}
      <UserProfileModal
        userId={selectedUserId}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </div>
  )
}