"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Lock } from "lucide-react"

interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void
  title: string
  message: string
}

export function PasswordModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  message
}: PasswordModalProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!password) {
      setError("Por favor, digite a senha")
      return
    }
    onConfirm(password)
    setPassword("")
    setError("")
  }

  const handleClose = () => {
    setPassword("")
    setError("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60000] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <p className="text-sm text-gray-400">
            {message}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="password">Senha de Administrador</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Digite a senha"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Lock className="h-4 w-4 mr-2" />
            Confirmar Exclusão
          </Button>
        </div>
      </div>
    </div>
  )
}