-- Create table to keep Evolution instance assigned per authenticated user.
CREATE TABLE IF NOT EXISTS user_evolution_integrations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  connection_status TEXT,
  pairing_code TEXT,
  raw_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
