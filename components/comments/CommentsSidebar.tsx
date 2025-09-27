"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, Filter, Search, ChevronRight, ChevronDown } from "lucide-react"
import CommentThread from "./CommentThread"

interface Comment {
  id: string
  content: string
  selection_start: number
  selection_end: number
  selected_text: string
  resolved: boolean
  created_at: string
  updated_at: string
  profiles: {
    id: string
    name: string
    avatar_url?: string
  }
  estruturas_invisiveis_comment_replies: Reply[]
}

interface Reply {
  id: string
  content: string
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url?: string
  }
}

interface CommentsSidebarProps {
  comments: Comment[]
  isOpen: boolean
  onToggle: () => void
  onCommentUpdate: (commentId: string, updates: Partial<Comment>) => void
  onCommentDelete: (commentId: string) => void
  onHighlightText: (start: number, end: number) => void
  estruturaId: string
}

type FilterType = 'all' | 'unresolved' | 'resolved'

export default function CommentsSidebar({
  comments,
  isOpen,
  onToggle,
  onCommentUpdate,
  onCommentDelete,
  onHighlightText,
  estruturaId
}: CommentsSidebarProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState("")

  const filteredComments = comments.filter(comment => {
    // Filter by status
    if (filter === 'resolved' && !comment.resolved) return false
    if (filter === 'unresolved' && comment.resolved) return false

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        comment.content.toLowerCase().includes(searchLower) ||
        comment.selected_text.toLowerCase().includes(searchLower) ||
        comment.profiles.name.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  // Sort comments by position in text
  const sortedComments = [...filteredComments].sort((a, b) => a.selection_start - b.selection_start)

  const unresolvedCount = comments.filter(c => !c.resolved).length
  const resolvedCount = comments.filter(c => c.resolved).length

  return (
    <>
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className={`fixed top-4 right-4 z-40 border-gray-700 ${
          isOpen ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
        } hover:bg-purple-700`}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        {comments.length}
        {isOpen ? <ChevronRight className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-700 shadow-xl z-30 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '400px' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Comentários</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-gray-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar comentários..."
                className="bg-gray-800 border-gray-700 text-white pl-10"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={`flex-1 text-xs ${
                  filter === 'all' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                Todos ({comments.length})
              </Button>
              <Button
                variant={filter === 'unresolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unresolved')}
                className={`flex-1 text-xs ${
                  filter === 'unresolved' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                Abertos ({unresolvedCount})
              </Button>
              <Button
                variant={filter === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('resolved')}
                className={`flex-1 text-xs ${
                  filter === 'resolved' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                Resolvidos ({resolvedCount})
              </Button>
            </div>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto">
            {sortedComments.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">
                  {searchTerm ? 'Nenhum comentário encontrado' : 'Nenhum comentário ainda'}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-gray-500">
                    Selecione um texto no editor para adicionar um comentário
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {sortedComments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    onCommentUpdate={onCommentUpdate}
                    onCommentDelete={onCommentDelete}
                    onHighlightText={onHighlightText}
                    estruturaId={estruturaId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <div className="text-xs text-gray-500 text-center">
              {comments.length === 0 ? (
                "Adicione comentários selecionando texto"
              ) : (
                `${unresolvedCount} em aberto • ${resolvedCount} resolvidos`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onToggle}
        />
      )}
    </>
  )
}