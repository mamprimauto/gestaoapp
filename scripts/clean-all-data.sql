-- ============================================
-- SCRIPT DE LIMPEZA TOTAL DE DADOS
-- ATENÇÃO: Este script irá DELETAR TODOS os dados!
-- ============================================

-- Começar uma transação para garantir atomicidade
BEGIN;

-- 1. Limpar comentários de tarefas (dependência de tasks)
DELETE FROM task_comments;

-- 2. Limpar sessões de tempo (dependência de tasks)
DELETE FROM time_tracking_sessions;

-- 3. Limpar itens de checklist (dependência de tasks)
DELETE FROM task_checklist_items;

-- 4. Limpar todas as tarefas
DELETE FROM tasks;

-- 5. Limpar comentários de testes A/B (dependência de ab_tests)
DELETE FROM ab_test_comments;

-- 6. Limpar variações de testes A/B (dependência de ab_tests)
DELETE FROM ab_test_variations;

-- 7. Limpar todos os testes A/B
DELETE FROM ab_tests;

-- 8. Limpar produtos do vault
DELETE FROM vault_products;

-- 9. Limpar workspace members (mantém apenas o owner)
-- Isso irá manter apenas os owners dos workspaces
DELETE FROM workspace_members 
WHERE role != 'owner';

-- 10. Resetar sequências se existirem
-- (PostgreSQL não precisa disso para UUIDs, mas se houver alguma sequência numérica)

-- Confirmar as mudanças
COMMIT;

-- Mostrar contagens finais para verificação
SELECT 'tasks' as table_name, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'task_comments', COUNT(*) FROM task_comments
UNION ALL
SELECT 'time_tracking_sessions', COUNT(*) FROM time_tracking_sessions
UNION ALL
SELECT 'task_checklist_items', COUNT(*) FROM task_checklist_items
UNION ALL
SELECT 'ab_tests', COUNT(*) FROM ab_tests
UNION ALL
SELECT 'ab_test_comments', COUNT(*) FROM ab_test_comments
UNION ALL
SELECT 'ab_test_variations', COUNT(*) FROM ab_test_variations
UNION ALL
SELECT 'vault_products', COUNT(*) FROM vault_products
UNION ALL
SELECT 'workspace_members', COUNT(*) FROM workspace_members
ORDER BY table_name;