"use client"

import { useState, useEffect } from "react"
import { DollarSign, Euro } from "lucide-react"

export default function DollarQuote() {
  const [dollarQuote, setDollarQuote] = useState<number | null>(null)
  const [euroQuote, setEuroQuote] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        // Buscar cotação do dólar no Banco Central
        const dollarResponse = await fetch(
          "https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados/ultimos/1?formato=json"
        )
        
        if (dollarResponse.ok) {
          const dollarData = await dollarResponse.json()
          if (dollarData && dollarData.length > 0) {
            setDollarQuote(parseFloat(dollarData[0].valor))
          }
        }

        // Buscar cotação do Euro no Banco Central
        const euroResponse = await fetch(
          "https://api.bcb.gov.br/dados/serie/bcdata.sgs.21619/dados/ultimos/1?formato=json"
        )
        
        if (euroResponse.ok) {
          const euroData = await euroResponse.json()
          if (euroData && euroData.length > 0) {
            setEuroQuote(parseFloat(euroData[0].valor))
          }
        }
      } catch (error) {

        // Fallback para outra API se falhar
        try {
          const fallbackResponse = await fetch(
            "https://api.exchangerate-api.com/v4/latest/BRL"
          )
          const fallbackData = await fallbackResponse.json()
          
          if (fallbackData && fallbackData.rates) {
            if (fallbackData.rates.USD) {
              setDollarQuote(1 / fallbackData.rates.USD)
            }
            if (fallbackData.rates.EUR) {
              setEuroQuote(1 / fallbackData.rates.EUR)
            }
          }
        } catch (fallbackError) {

        }
      } finally {
        setLoading(false)
      }
    }

    // Buscar cotação inicial
    fetchQuotes()

    // Atualizar a cada 1 hora
    const interval = setInterval(fetchQuotes, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="px-4 py-3 border-t border-[#2E2E30]">
      <div className="flex justify-center gap-6">
        {/* Dólar */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3.5 w-3.5 text-green-400" />
            <span className="text-white/60 text-[11px]">Dólar</span>
          </div>
          {loading ? (
            <div className="text-white/90 font-medium text-[12px]">...</div>
          ) : dollarQuote ? (
            <div className="text-white/90 font-semibold text-[13px]">
              {formatCurrency(dollarQuote)}
            </div>
          ) : (
            <div className="text-white/50 text-[12px]">--</div>
          )}
        </div>

        {/* Divider */}
        <div className="w-[1px] bg-[#2E2E30] self-stretch"></div>

        {/* Euro */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-white/60 text-[11px]">Euro</span>
          </div>
          {loading ? (
            <div className="text-white/90 font-medium text-[12px]">...</div>
          ) : euroQuote ? (
            <div className="text-white/90 font-semibold text-[13px]">
              {formatCurrency(euroQuote)}
            </div>
          ) : (
            <div className="text-white/50 text-[12px]">--</div>
          )}
        </div>
      </div>
    </div>
  )
}