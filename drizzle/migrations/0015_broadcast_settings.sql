-- Store per-user delay between messages (in milliseconds)
CREATE TABLE IF NOT EXISTS broadcast_settings (
  user_id UUID PRIMARY KEY REFERENCES "Users"(id) ON DELETE CASCADE,
  delay_ms INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
