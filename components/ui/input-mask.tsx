"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { applyCPFMask, applyPhoneMask, applyCEPMask } from "@/lib/masks"

export interface InputMaskProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask?: 'cpf' | 'phone' | 'cep' | 'none'
  onValueChange?: (value: string) => void
}

const InputMask = React.forwardRef<HTMLInputElement, InputMaskProps>(
  ({ mask = 'none', onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let maskedValue = e.target.value

      // Aplicar máscara baseada no tipo
      switch (mask) {
        case 'cpf':
          maskedValue = applyCPFMask(e.target.value)
          break
        case 'phone':
          maskedValue = applyPhoneMask(e.target.value)
          break
        case 'cep':
          maskedValue = applyCEPMask(e.target.value)
          break
        default:
          maskedValue = e.target.value
      }

      // Atualizar o valor no input
      e.target.value = maskedValue

      // Chamar callbacks
      if (onChange) {
        onChange(e)
      }

      if (onValueChange) {
        onValueChange(maskedValue)
      }
    }

    return (
      <Input
        {...props}
        ref={ref}
        onChange={handleChange}
      />
    )
  }
)

InputMask.displayName = "InputMask"

export { InputMask }