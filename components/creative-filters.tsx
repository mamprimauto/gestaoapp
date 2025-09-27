"use client"

import React from "react"
import { Filter, X, Users, Settings, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface CreativeFilters {
  status: string
  copy: string
  editor: string
}

interface CreativeFiltersProps {
  filters: CreativeFilters
  onFiltersChange: (filters: CreativeFilters) => void
  availableCopyList: string[]
  availableEditorList: string[]
  className?: string
}

const statusOptions = [
  { value: "all", label: "Todos os status", icon: null },
  { value: "NAO VALIDADO", label: "Não Validado", icon: "🔵" },
  { value: "TESTANDO", label: "Testando", icon: "🟡" },
  { value: "RETESTAR", label: "Retestar", icon: "🟠" },
  { value: "VALIDADO", label: "Validado", icon: "🟢" },
  { value: "SUPER VALIDADO", label: "Super Validado", icon: "💚" },
  { value: "REJEITADO", label: "Rejeitado", icon: "🔴" },
  { value: "NAO USADO", label: "Não Usado", icon: "⚫" }
]

export function CreativeFilters({ 
  filters, 
  onFiltersChange, 
  availableCopyList, 
  availableEditorList,
  className 
}: CreativeFiltersProps) {
  
  const updateFilter = (key: keyof CreativeFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearAllFilters = () => {
    onFiltersChange({ status: "all", copy: "all", editor: "all" })
  }

  const hasActiveFilters = filters.status !== "all" || filters.copy !== "all" || filters.editor !== "all"
  const activeFilterCount = [filters.status, filters.copy, filters.editor].filter(f => f !== "all").length

  return (
    <div className={cn("flex flex-col lg:flex-row gap-4 items-start lg:items-center flex-1", className)}>
      {/* Filtro de Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/70 whitespace-nowrap">Status:</span>
        <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
          <SelectTrigger className="w-full bg-[#2A2A2C] border-[#3A3A3C] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2A2A2C] border-[#3A3A3C]">
            {statusOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]"
              >
                <div className="flex items-center gap-2">
                  {option.icon && <span>{option.icon}</span>}
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Copy */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/70 whitespace-nowrap">Copy:</span>
        <Select value={filters.copy} onValueChange={(value) => updateFilter("copy", value)}>
          <SelectTrigger className="w-full bg-[#2A2A2C] border-[#3A3A3C] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2A2A2C] border-[#3A3A3C]">
            <SelectItem
              value="all"
              className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]"
            >
              Todos
            </SelectItem>
            {availableCopyList.map((copy) => (
              <SelectItem
                key={copy}
                value={copy}
                className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]"
              >
                {copy || "Sem copy"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Editor */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/70 whitespace-nowrap">Editor:</span>
        <Select value={filters.editor} onValueChange={(value) => updateFilter("editor", value)}>
          <SelectTrigger className="w-full bg-[#2A2A2C] border-[#3A3A3C] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2A2A2C] border-[#3A3A3C]">
            <SelectItem
              value="all"
              className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]"
            >
              Todos
            </SelectItem>
            {availableEditorList.map((editor) => (
              <SelectItem
                key={editor}
                value={editor}
                className="text-white hover:bg-[#3A3A3C] focus:bg-[#3A3A3C]"
              >
                {editor || "Sem editor"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Controles de filtros */}
      <div className="flex items-center gap-2">
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
          </Badge>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-3 text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  )
}