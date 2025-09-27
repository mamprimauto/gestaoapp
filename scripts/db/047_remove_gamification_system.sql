-- ========================================
-- Remove Track Record Gamification System
-- ========================================
-- Remove completamente o sistema de gamificação do track record

-- Remove triggers first
DROP TRIGGER IF EXISTS trigger_update_track_record_user_stats ON track_records;
DROP TRIGGER IF EXISTS trigger_update_user_track_record_stats ON track_records;

-- Remove functions
DROP FUNCTION IF EXISTS update_user_track_record_stats();
DROP FUNCTION IF EXISTS update_track_record_user_stats();

-- Remove tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS track_record_user_achievements;
DROP TABLE IF EXISTS track_record_achievements;
DROP TABLE IF EXISTS track_record_comment_reactions;
DROP TABLE IF EXISTS track_record_comments;
DROP TABLE IF EXISTS track_record_user_stats;

-- Remove any indexes that might have been created
DROP INDEX IF EXISTS idx_track_record_user_stats_user_id;
DROP INDEX IF EXISTS idx_track_record_user_stats_org_id;
DROP INDEX IF EXISTS idx_track_record_achievements_criteria;
DROP INDEX IF EXISTS idx_track_record_user_achievements_user_id;
DROP INDEX IF EXISTS idx_track_record_comments_track_record_id;
DROP INDEX IF EXISTS idx_track_record_comment_reactions_comment_id;

-- Clean up any remaining sequences
DROP SEQUENCE IF EXISTS track_record_user_stats_id_seq CASCADE;
DROP SEQUENCE IF EXISTS track_record_achievements_id_seq CASCADE;
DROP SEQUENCE IF EXISTS track_record_user_achievements_id_seq CASCADE;
DROP SEQUENCE IF EXISTS track_record_comments_id_seq CASCADE;
DROP SEQUENCE IF EXISTS track_record_comment_reactions_id_seq CASCADE;

-- Optional: Remove any views that might depend on these tables
DROP VIEW IF EXISTS track_record_leaderboard;
DROP VIEW IF EXISTS user_achievement_progress;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Sistema de gamificação removido com sucesso!';
  RAISE NOTICE 'Tabelas removidas: track_record_user_stats, track_record_achievements, track_record_user_achievements, track_record_comments, track_record_comment_reactions';
  RAISE NOTICE 'Funções e triggers relacionados também foram removidos.';
END $$;