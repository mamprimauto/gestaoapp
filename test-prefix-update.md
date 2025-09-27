# Teste de Atualização do Prefixo da Oferta

## Funcionalidade Implementada

1. **Simplificação da Configuração**:
   - Removidas todas as opções exceto "Prefixo da Oferta"
   - Interface mais limpa e focada

2. **Atualização em Massa**:
   - Ao salvar o novo prefixo, todos os criativos do produto são atualizados automaticamente
   - O título de cada criativo é regenerado com o novo prefixo

3. **Atualização em Tempo Real**:
   - Usando o sistema de real-time do Supabase através do TaskDataProvider
   - Todos os usuários conectados verão as mudanças instantaneamente

## Como Testar

1. Abra a página `/criativos`
2. Clique no ícone de engrenagem (⚙️) ao lado do nome do produto
3. No modal que abre, você verá apenas o campo "Prefixo da Oferta"
4. Digite um novo prefixo (ex: "TEST")
5. Clique em "Salvar"
6. Observe que:
   - Todos os criativos do produto terão seus títulos atualizados
   - O prefixo mudará de (ex: NM) para TEST
   - A mensagem mostrará quantos criativos foram atualizados
   - Em outras abas/dispositivos, a mudança aparecerá automaticamente

## Exemplo de Mudança

**Antes**: #1-NM-9x16-STA-0-EN-CB0-H1-B1-R0-JOA-MAR-FB
**Depois**: #1-TEST-9x16-STA-0-EN-CB0-H1-B1-R0-JOA-MAR-FB

## Observações

- A atualização preserva todos os outros dados do criativo
- Apenas o prefixo e o título são alterados
- A operação é atômica para cada criativo