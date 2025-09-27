"use client"

import { useState } from "react"
import { Library, FileText, ArrowRight, BookOpen, Search, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SwipeFilePage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const handleOptionClick = (option: string) => {
    if (option === 'bibliotecas') {
      window.location.href = '/swipe-file/bibliotecas'
    } else if (option === 'briefings') {
      window.location.href = '/swipe-file/briefings'
    } else if (option === 'estruturas-invisiveis') {
      window.location.href = '/swipe-file/estruturas-invisiveis'
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1b23] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <BookOpen className="h-10 w-10 text-blue-500" />
            Pesquisa & Inteligência
          </h1>
          <p className="text-gray-400 text-lg">
            Escolha a seção que deseja acessar
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Opção 1 - Bibliotecas do Facebook */}
          <Card 
            className="bg-gray-800/30 border-gray-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => handleOptionClick('bibliotecas')}
          >
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 p-4 bg-blue-500/20 rounded-full w-fit group-hover:bg-blue-500/30 transition-colors">
                <Library className="h-12 w-12 text-blue-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                Bibliotecas do Facebook
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Acesse todas as bibliotecas de anúncios do Facebook organizadas por nichos
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                  <span>Visualizar bibliotecas por nicho</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                  <span>Rastrear crescimento de anúncios</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                  <span>Solicitar acesso Insider</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                  <span>Identificar campanhas escalando</span>
                </div>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:bg-blue-500 transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOptionClick('bibliotecas')
                }}
              >
                Acessar Bibliotecas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Opção 2 - Briefings e Pesquisas */}
          <Card 
            className="bg-gray-800/30 border-gray-700 hover:border-green-500/50 transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => handleOptionClick('briefings')}
          >
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 p-4 bg-green-500/20 rounded-full w-fit group-hover:bg-green-500/30 transition-colors">
                <FileText className="h-12 w-12 text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors">
                Briefings e Pesquisas
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Gerencie briefings de produtos, pesquisas e documentos estratégicos
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                  <span>Criar briefings detalhados</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                  <span>Organizar pesquisas de mercado</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                  <span>Documentos estratégicos</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                  <span>Templates de produtos</span>
                </div>
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white group-hover:bg-green-500 transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOptionClick('briefings')
                }}
              >
                Acessar Briefings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Opção 3 - Estruturas Invisíveis */}
          <Card 
            className="bg-gray-800/30 border-gray-700 hover:border-purple-500/50 transition-all duration-300 cursor-pointer hover:scale-105 group"
            onClick={() => handleOptionClick('estruturas-invisiveis')}
          >
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 p-4 bg-purple-500/20 rounded-full w-fit group-hover:bg-purple-500/30 transition-colors">
                <Layers className="h-12 w-12 text-purple-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                Estruturas Invisíveis
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Analise e marque estruturas de anúncios com anotações personalizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                  <span>Editor de texto com anotações</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                  <span>Marcar blocos de estrutura</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                  <span>Personalizar cores e tags</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                  <span>Análise visual de padrões</span>
                </div>
              </div>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white group-hover:bg-purple-500 transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOptionClick('estruturas-invisiveis')
                }}
              >
                Acessar Estruturas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer info */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700">
            <Search className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">
              Use a busca dentro de cada seção para encontrar conteúdo específico
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}