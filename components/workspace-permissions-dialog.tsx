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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Shield, Loader2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Workspace } from "@/app/tarefas/page"

interface WorkspacePermissionsDialogProps {
  workspace: Workspace | null
  isOpen: boolean
  onClose: () => void
  userRole: string | null
}

type RoleCode = "admin" | "editor" | "copywriter" | "gestor_trafego" | "minerador"

const ROLES: { code: RoleCode; label: string; description: string }[] = [
  { code: "admin", label: "Administrador", description: "Acesso total ao sistema" },
  { code: "editor", label: "Editor", description: "Equipe de edição de vídeo" },
  { code: "copywriter", label: "Copywriter", description: "Criação de textos e conteúdo" },
  { code: "gestor_trafego", label: "Gestor de Tráfego", description: "Gestão de campanhas" },
  { code: "minerador", label: "Minerador", description: "Pesquisa e mineração de dados" },
]

export default function WorkspacePermissionsDialog({
  workspace,
  isOpen,
  onClose,
  userRole,
}: WorkspacePermissionsDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allowedRoles, setAllowedRoles] = useState<RoleCode[]>([])

  // Carregar permissões atuais sempre que o dialog for aberto
  useEffect(() => {
    if (isOpen && workspace) {

      loadPermissions()
    }
  }, [isOpen, workspace?.id])

  async function loadPermissions() {
    if (!workspace) return
    
    setLoading(true)
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from("workspace_permissions")
        .select("allowed_roles")
        .eq("workspace_id", workspace.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (data) {
        // Garantir que admin SEMPRE está incluído
        const roles = [...(data.allowed_roles || [])]
        if (!roles.includes("admin")) {
          roles.push("admin")
        }

        setAllowedRoles(roles)
      } else {
        // Se não existir, todos têm acesso por padrão
        const defaultRoles = ROLES.map(r => r.code)

        setAllowedRoles(defaultRoles)
      }
    } catch (error: any) {

      toast({
        title: "Erro ao carregar permissões",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function savePermissions() {
    if (!workspace) return

    setSaving(true)
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Garantir que admin SEMPRE está nas permissões
      const rolesToSave = [...allowedRoles]
      if (!rolesToSave.includes("admin")) {
        rolesToSave.push("admin")
      }

      // Verificar se já existe um registro para este workspace
      const { data: existingRecord, error: checkError } = await supabase
        .from("workspace_permissions")
        .select("id")
        .eq("workspace_id", workspace.id)
        .maybeSingle()

      let error
      if (existingRecord) {

        // Atualizar registro existente
        const result = await supabase
          .from("workspace_permissions")
          .update({
            allowed_roles: rolesToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", workspace.id)
        error = result.error

      } else {

        // Criar novo registro
        const result = await supabase
          .from("workspace_permissions")
          .insert({
            workspace_id: workspace.id,
            allowed_roles: rolesToSave,
            created_by: user?.id,
          })
        error = result.error

      }

      if (error) throw error

      toast({
        title: "Permissões salvas",
        description: "As permissões foram atualizadas com sucesso",
      })
      
      onClose()
    } catch (error: any) {

      toast({
        title: "Erro ao salvar permissões",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function toggleRole(role: RoleCode) {
    // Admin sempre deve ter acesso
    if (role === "admin") return

    setAllowedRoles(prev => {
      const newRoles = prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
      
      return newRoles
    })
  }

  // Se não está aberto, não renderizar
  if (!isOpen) return null
  
  // Apenas admins podem ver este dialog
  if (!workspace || userRole !== "admin") {

    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#1C1C1E] text-white border-[#2A2A2C] z-[999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Permissões - {workspace.name}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Selecione quais funções podem acessar este departamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          ) : (
            <div className="space-y-3">
              {ROLES.map((role) => (
                <div
                  key={role.code}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Checkbox
                    id={role.code}
                    checked={allowedRoles.includes(role.code)}
                    onCheckedChange={() => toggleRole(role.code)}
                    disabled={role.code === "admin"} // Admin sempre tem acesso
                    className="mt-1 border-white/30 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={role.code}
                      className="text-sm font-medium text-white cursor-pointer"
                    >
                      {role.label}
                      {role.code === "admin" && (
                        <span className="ml-2 text-xs text-white/50">(sempre tem acesso)</span>
                      )}
                    </Label>
                    <p className="text-xs text-white/60 mt-1">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#2A2A2C]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={savePermissions}
            disabled={saving || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Permissões"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}