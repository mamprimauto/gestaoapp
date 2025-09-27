"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Palette, Highlighter, RotateCcw } from 'lucide-react'

interface TiptapEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}

export default function TiptapEditor({ 
  value, 
  onChange, 
  placeholder = "Digite o conteúdo aqui...",
  readOnly = false 
}: TiptapEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value || '',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
  })

  // Sync value changes
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  // Sync readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowColorPicker(false)
      setShowHighlightPicker(false)
    }

    if (showColorPicker || showHighlightPicker) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showColorPicker, showHighlightPicker])

  const textColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#808080', '#c0c0c0',
    '#ff9999', '#99ff99', '#9999ff', '#ffff99', '#ff99ff', '#99ffff', '#ffcc99', '#cc99ff'
  ]

  const highlightColors = [
    '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9999', '#99ff99', '#9999ff', '#ffcc99',
    '#ffd700', '#98fb98', '#87ceeb', '#dda0dd', '#f0e68c', '#90ee90', '#add8e6', '#f5deb3'
  ]

  if (!editor) {
    return (
      <div className="min-h-[500px] bg-gray-800 border border-gray-700 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Carregando editor...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-700 bg-gray-800 rounded-t-lg flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-600' : ''}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-600' : ''}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-600 mx-1" />
          
          {/* Clear Formatting */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className="h-8 w-8 p-0"
            title="Limpar formatação"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-600 mx-1" />
          
          {/* Text Color */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowColorPicker(!showColorPicker)
                setShowHighlightPicker(false)
              }}
              className="h-8 w-8 p-0"
            >
              <Palette className="h-4 w-4" />
            </Button>
            
            {showColorPicker && (
              <div 
                className="absolute top-10 left-0 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg min-w-[280px] sm:min-w-[320px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-sm text-gray-400 mb-3 font-medium">Cor do Texto</div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {textColors.map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 sm:w-7 sm:h-7 rounded border border-gray-600 hover:scale-110 transition-transform shadow-sm"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run()
                        setShowColorPicker(false)
                      }}
                    />
                  ))}
                </div>
                <button
                  className="mt-3 text-sm text-gray-400 hover:text-white underline w-full text-left"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run()
                    setShowColorPicker(false)
                  }}
                >
                  Remover cor
                </button>
              </div>
            )}
          </div>
          
          {/* Highlight Color */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker)
                setShowColorPicker(false)
              }}
              className="h-8 w-8 p-0"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            
            {showHighlightPicker && (
              <div 
                className="absolute top-10 left-0 z-50 bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg min-w-[280px] sm:min-w-[320px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-sm text-gray-400 mb-3 font-medium">Cor de Fundo</div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {highlightColors.map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 sm:w-7 sm:h-7 rounded border border-gray-600 hover:scale-110 transition-transform shadow-sm"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        editor.chain().focus().setHighlight({ color }).run()
                        setShowHighlightPicker(false)
                      }}
                    />
                  ))}
                </div>
                <button
                  className="mt-3 text-sm text-gray-400 hover:text-white underline w-full text-left"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run()
                    setShowHighlightPicker(false)
                  }}
                >
                  Remover destaque
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="prose prose-invert max-w-none">
        <EditorContent 
          editor={editor} 
          className="min-h-[500px] p-4 bg-gray-800 text-gray-100 rounded-b-lg focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[460px] [&_.ProseMirror]:bg-gray-800 [&_.ProseMirror]:text-gray-100"
        />
      </div>

      {/* Custom CSS for placeholder */}
      <style jsx global>{`
        .ProseMirror {
          outline: none !important;
          background-color: #1f2937 !important;
          color: #f3f4f6 !important;
          min-height: 460px !important;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #6b7280;
          pointer-events: none;
          height: 0;
          float: left;
        }
        
        .ProseMirror strong {
          font-weight: 700;
        }
        
        .ProseMirror em {
          font-style: italic;
        }
        
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
        }
        
        .ProseMirror li {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  )
}