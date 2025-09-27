-- Add support for YouTube videos in lessons table

-- Add video_type column to distinguish between Vimeo and YouTube
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'vimeo' CHECK (video_type IN ('vimeo', 'youtube'));

-- Rename vimeo_id to video_id to be platform-agnostic
ALTER TABLE lessons 
RENAME COLUMN vimeo_id TO video_id;

-- Update existing records to have video_type = 'vimeo'
UPDATE lessons SET video_type = 'vimeo' WHERE video_type IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN lessons.video_id IS 'Video ID from the platform (Vimeo ID or YouTube video ID)';
COMMENT ON COLUMN lessons.video_type IS 'Platform type: vimeo or youtube';