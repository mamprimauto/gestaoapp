-- Adicionar campo tracking_start_date para armazenar a data fixa do início do rastreamento
ALTER TABLE swipe_files ADD COLUMN IF NOT EXISTS tracking_start_date DATE;

-- Comentário explicativo
COMMENT ON COLUMN swipe_files.tracking_start_date IS 'Data fixa que representa o Dia 1 do rastreamento. Uma vez definida, nunca muda para manter consistência histórica.';