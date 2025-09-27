"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wrench } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function FixDurationsButton() {
  const [fixing, setFixing] = useState(false)

  const handleFix = async () => {
    if (!confirm("Tem certeza que deseja recalcular as durações das dailys baseando-se nos horários de início e fim?")) {
      return
    }

    setFixing(true)

    try {
      const supabase = await getSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token

      if (!token) {
        toast.error("Usuário não autenticado")
        return
      }

      const response = await fetch("/api/fix-daily-durations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao corrigir durações")
      }

      const result = await response.json()

      toast.success(result.message)

      // Show details if any were fixed
      if (result.fixed > 0) {
        console.log('Dailys corrigidas:', result.updates)
      }

      // Reload page to show updated data
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error) {
      console.error("Error fixing durations:", error)
      toast.error("Erro ao corrigir durações")
    } finally {
      setFixing(false)
    }
  }

  return (
    <Button
      onClick={handleFix}
      disabled={fixing}
      variant="outline"
      size="sm"
    >
      <Wrench className="h-4 w-4 mr-2" />
      {fixing ? "Corrigindo..." : "Corrigir Durações"}
    </Button>
  )
}