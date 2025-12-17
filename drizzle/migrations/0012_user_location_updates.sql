CREATE TABLE IF NOT EXISTS dev_iecg.user_location_updates (
  id SERIAL PRIMARY KEY,
  "nfcUserId" INTEGER NOT NULL,
  latitude VARCHAR(32) NOT NULL,
  longitude VARCHAR(32) NOT NULL,
  accuracy INTEGER,
  "deviceInfo" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_location_updates_nfcUserId
  ON dev_iecg.user_location_updates("nfcUserId");
