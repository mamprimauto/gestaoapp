"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function CleanupDailysButton() {
  const [cleaning, setCleaning] = useState(false)

  const handleCleanup = async () => {
    if (!confirm("Tem certeza que deseja remover todas as dailys com dados fictícios? Esta ação não pode ser desfeita.")) {
      return
    }

    setCleaning(true)

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch("/api/cleanup-dailys", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao executar limpeza")
      }

      const result = await response.json()

      toast.success(result.message)

      // Reload page to show updated list
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error) {
      console.error("Error cleaning up dailys:", error)
      toast.error("Erro ao executar limpeza")
    } finally {
      setCleaning(false)
    }
  }

  return (
    <Button
      onClick={handleCleanup}
      disabled={cleaning}
      variant="destructive"
      size="sm"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {cleaning ? "Limpando..." : "Limpar Dados Fictícios"}
    </Button>
  )
}