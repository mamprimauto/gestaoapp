# YouTube Video Support Migration

## What was added:
YouTube video support has been added to the courses system alongside the existing Vimeo support.

## Database Migration Required:
You need to run the following SQL migration in your Supabase SQL Editor:

```sql
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
```

## Updated Features:

### 1. Course Viewer (`/cursos/[id]`)
- Now supports both YouTube and Vimeo videos
- Automatically detects video type and renders appropriate player
- YouTube videos use the standard YouTube embed player
- Vimeo videos continue to use the Vimeo Player SDK with progress tracking

### 2. Admin Panel - Lesson Creation
- New dropdown to select video platform (YouTube or Vimeo)
- Accepts various URL formats:
  - YouTube: `https://youtube.com/watch?v=VIDEO_ID`, `https://youtu.be/VIDEO_ID`, or just `VIDEO_ID`
  - Vimeo: `https://vimeo.com/VIDEO_ID` or just `VIDEO_ID`
- Automatically extracts video ID from URLs

### 3. API Updates
- `/api/courses` now returns `video_id` and `video_type` fields
- `/api/lessons` supports creating lessons with YouTube videos
- Backward compatible with existing Vimeo-only lessons

## How to Use:

1. **Run the SQL migration above in Supabase**
2. **Create a new lesson with YouTube:**
   - Go to `/cursos` page
   - Click on "Gerenciar" tab
   - Add a new lesson
   - Select "YouTube" as the platform
   - Paste a YouTube URL or video ID
   - Save

3. **The system will automatically:**
   - Extract the video ID from the URL
   - Save the correct video type
   - Display the appropriate player in the course viewer

## Notes:
- Existing Vimeo lessons will continue to work without any changes
- Progress tracking currently only works for Vimeo videos (YouTube API integration would be needed for YouTube progress tracking)
- YouTube videos will show a standard YouTube player with all regular YouTube controls