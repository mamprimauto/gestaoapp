'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export default function VaultPage() {
  const [isWorking, setIsWorking] = useState(false)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Vault de Senhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold mb-4">Sistema Temporariamente em Manutenção</h2>
              <p className="text-muted-foreground mb-6">
                Estamos corrigindo um erro de sintaxe no componente do vault.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                O backup completo do código está salvo em:
              </p>
              <code className="text-xs bg-muted p-2 rounded">
                /app/vault/page.tsx.backup
              </code>
              <div className="mt-6">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsWorking(true)
                    setTimeout(() => setIsWorking(false), 2000)
                  }}
                  disabled={isWorking}
                >
                  {isWorking ? 'Processando...' : 'Testar Conexão'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}