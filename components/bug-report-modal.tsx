"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bug, Loader2, Link } from "lucide-react"

interface BugReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const { toast } = useToast()
  const [description, setDescription] = useState("")
  const [screenshotUrl, setScreenshotUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Por favor, descreva o problema encontrado",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {

      // Get browser info and current page
      const browserInfo = navigator.userAgent
      const pageUrl = window.location.href

      // Submit bug report
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          screenshot_url: screenshotUrl.trim() || null,
          browser_info: browserInfo,
          page_url: pageUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao enviar relatório")
      }

      toast({
        title: "Bug reportado com sucesso!",
        description: "Obrigado por nos ajudar a melhorar o sistema.",
      })

      // Reset form
      setDescription("")
      setScreenshotUrl("")
      onOpenChange(false)
    } catch (error: any) {

      toast({
        title: "Erro ao enviar relatório",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1F1F1F] border-[#3A3A3C] text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Bug className="h-5 w-5 text-red-500" />
            Reportar Bug
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Descreva o problema encontrado e adicione uma captura de tela se possível
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Screenshot URL */}
          <div>
            <Label htmlFor="screenshot" className="text-white/80 mb-2">
              Link da Captura de Tela (opcional)
            </Label>
            <div className="space-y-2">
              <Input
                id="screenshot"
                type="url"
                placeholder="https://imgur.com/... ou https://drive.google.com/..."
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                className="bg-[#2C2C2E] border-[#3A3A3C] text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/50 flex items-center gap-1">
                <Link className="h-3 w-3" />
                Faça upload da imagem no Google Drive, Imgur, ou outro serviço e cole o link aqui
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white/80 mb-2">
              Descrição do Problema *
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que aconteceu, o que você esperava e quais passos levaram ao erro..."
              className="min-h-[120px] bg-[#2C2C2E] border-[#3A3A3C] text-white placeholder:text-white/40"
            />
          </div>

          {/* Browser Info (informational) */}
          <div className="text-xs text-white/40 bg-[#2C2C2E] p-3 rounded-lg">
            <p className="mb-1">
              <strong>Página atual:</strong> {window.location.pathname}
            </p>
            <p className="truncate">
              <strong>Navegador:</strong> {navigator.userAgent.substring(0, 50)}...
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="bg-[#2C2C2E] border-[#3A3A3C] hover:bg-[#3A3A3C]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4 mr-2" />
                Enviar Relatório
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}