-- Create dailys table for daily meetings/standup tracking
CREATE TABLE IF NOT EXISTS public.dailys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER, -- calculated field
    attendance JSONB DEFAULT '[]', -- array of {name, entry_time}
    company_focus TEXT,
    next_steps TEXT,
    challenges TEXT,
    individual_priorities JSONB DEFAULT '{}', -- {user_id: priority_text}
    is_active BOOLEAN DEFAULT false, -- for timer state
    timer_start_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE public.dailys ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to manage their own dailys and those they participate in
DROP POLICY IF EXISTS "Users can manage their dailys" ON public.dailys;
CREATE POLICY "Users can manage their dailys" ON public.dailys
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.uid()::text = ANY(SELECT jsonb_object_keys(individual_priorities))
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dailys_user_id ON public.dailys(user_id);
CREATE INDEX IF NOT EXISTS idx_dailys_date ON public.dailys(date DESC);
CREATE INDEX IF NOT EXISTS idx_dailys_date_user ON public.dailys(date, user_id);

-- Unique constraint to prevent multiple dailys per user per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_dailys_user_date_unique 
ON public.dailys(user_id, date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dailys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_dailys_updated_at ON public.dailys;
CREATE TRIGGER trigger_dailys_updated_at
    BEFORE UPDATE ON public.dailys
    FOR EACH ROW
    EXECUTE FUNCTION update_dailys_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.dailys IS 'Daily meetings/standup tracking system';
COMMENT ON COLUMN public.dailys.date IS 'Date of the daily meeting';
COMMENT ON COLUMN public.dailys.start_time IS 'Meeting start time';
COMMENT ON COLUMN public.dailys.end_time IS 'Meeting end time';
COMMENT ON COLUMN public.dailys.duration_minutes IS 'Calculated meeting duration in minutes';
COMMENT ON COLUMN public.dailys.attendance IS 'Array of attendees with entry times: [{name: string, entry_time: time}]';
COMMENT ON COLUMN public.dailys.company_focus IS 'Current company focus/priority';
COMMENT ON COLUMN public.dailys.next_steps IS 'Next steps and action items';
COMMENT ON COLUMN public.dailys.challenges IS 'Current challenges and blockers';
COMMENT ON COLUMN public.dailys.individual_priorities IS 'Individual priorities by user: {user_id: priority_text}';
COMMENT ON COLUMN public.dailys.is_active IS 'Whether the daily timer is currently running';
COMMENT ON COLUMN public.dailys.timer_start_time IS 'When the daily timer was started';