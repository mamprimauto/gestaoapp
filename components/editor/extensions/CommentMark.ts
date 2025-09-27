import { Mark, mergeAttributes } from '@tiptap/core'

export interface CommentOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string, commentNumber: number, commentColor: string) => ReturnType
      toggleComment: (commentId: string, commentNumber: number, commentColor: string) => ReturnType
      unsetComment: () => ReturnType
    }
  }
}

export const CommentMark = Mark.create<CommentOptions>({
  name: 'comment',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {}
          }
          return {
            'data-comment-id': attributes.commentId,
          }
        },
      },
      commentNumber: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-number'),
        renderHTML: attributes => {
          if (!attributes.commentNumber) {
            return {}
          }
          return {
            'data-comment-number': attributes.commentNumber,
          }
        },
      },
      commentColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-color'),
        renderHTML: attributes => {
          if (!attributes.commentColor) {
            return {}
          }
          return {
            'data-comment-color': attributes.commentColor,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const commentNumber = HTMLAttributes['data-comment-number']
    const commentColor = HTMLAttributes['data-comment-color'] || '#3b82f6'
    
    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          class: 'comment-mark cursor-pointer transition-all duration-200 relative inline-block',
          style: `background-color: ${commentColor}20; border: 1px solid ${commentColor}; border-radius: 3px; padding: 1px 3px; position: relative;`,
          'data-comment-id': HTMLAttributes['data-comment-id'],
          'data-comment-number': commentNumber,
          'data-comment-color': commentColor
        }
      ),
      0,
    ]
  },

  addCommands() {
    return {
      setComment:
        (commentId: string, commentNumber: number, commentColor: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId, commentNumber, commentColor })
        },
      toggleComment:
        (commentId: string, commentNumber: number, commentColor: string) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, { commentId, commentNumber, commentColor })
        },
      unsetComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})