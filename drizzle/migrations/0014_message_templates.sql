-- Create table for broadcast message templates
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);
