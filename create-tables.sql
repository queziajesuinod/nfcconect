-- Create tables in dev_iecg schema

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS dev_iecg.refresh_tokens (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "ipAddress" VARCHAR(64),
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- NFC Tags table
CREATE TABLE IF NOT EXISTS dev_iecg.nfc_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255),
  description TEXT,
  location VARCHAR(255),
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- NFC Users table
CREATE TABLE IF NOT EXISTS dev_iecg.nfc_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  organization VARCHAR(255),
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Check-in Schedules table
CREATE TABLE IF NOT EXISTS dev_iecg.checkin_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "startTime" TIMESTAMPTZ NOT NULL,
  "endTime" TIMESTAMPTZ NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS dev_iecg.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "nfcUserId" UUID NOT NULL,
  "nfcTagId" UUID NOT NULL,
  "scheduleId" UUID,
  "checkinTime" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  location VARCHAR(255),
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Connection Logs table
CREATE TABLE IF NOT EXISTS dev_iecg.connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  action VARCHAR(255) NOT NULL,
  "ipAddress" VARCHAR(64),
  "userAgent" TEXT,
  status VARCHAR(50) DEFAULT 'success' NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Dynamic Links table
CREATE TABLE IF NOT EXISTS dev_iecg.dynamic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "shortCode" VARCHAR(50) NOT NULL UNIQUE,
  "targetUrl" TEXT NOT NULL,
  description TEXT,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notification Groups table
CREATE TABLE IF NOT EXISTS dev_iecg.notification_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "redirectUrl" TEXT,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Group-User Relations table
CREATE TABLE IF NOT EXISTS dev_iecg.group_user_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Group-Schedule Relations table
CREATE TABLE IF NOT EXISTS dev_iecg.group_schedule_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL,
  "scheduleId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User-Tag Relations table
CREATE TABLE IF NOT EXISTS dev_iecg.user_tag_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tagId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Schedule-Tag Relations table
CREATE TABLE IF NOT EXISTS dev_iecg.schedule_tag_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "scheduleId" UUID NOT NULL,
  "tagId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Location Updates table
CREATE TABLE IF NOT EXISTS dev_iecg.user_location_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  accuracy NUMERIC(10, 2),
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Automatic Check-ins table
CREATE TABLE IF NOT EXISTS dev_iecg.automatic_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "scheduleId" UUID NOT NULL,
  "tagId" UUID NOT NULL,
  "isEnabled" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON dev_iecg.refresh_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_nfc_tags_uid ON dev_iecg.nfc_tags(uid);
CREATE INDEX IF NOT EXISTS idx_nfc_users_email ON dev_iecg.nfc_users(email);
CREATE INDEX IF NOT EXISTS idx_checkins_nfcUserId ON dev_iecg.checkins("nfcUserId");
CREATE INDEX IF NOT EXISTS idx_checkins_nfcTagId ON dev_iecg.checkins("nfcTagId");
CREATE INDEX IF NOT EXISTS idx_checkins_scheduleId ON dev_iecg.checkins("scheduleId");
CREATE INDEX IF NOT EXISTS idx_connection_logs_userId ON dev_iecg.connection_logs("userId");
CREATE INDEX IF NOT EXISTS idx_dynamic_links_shortCode ON dev_iecg.dynamic_links("shortCode");
CREATE INDEX IF NOT EXISTS idx_group_user_relations_groupId ON dev_iecg.group_user_relations("groupId");
CREATE INDEX IF NOT EXISTS idx_group_user_relations_userId ON dev_iecg.group_user_relations("userId");
CREATE INDEX IF NOT EXISTS idx_group_schedule_relations_groupId ON dev_iecg.group_schedule_relations("groupId");
CREATE INDEX IF NOT EXISTS idx_group_schedule_relations_scheduleId ON dev_iecg.group_schedule_relations("scheduleId");
CREATE INDEX IF NOT EXISTS idx_user_tag_relations_userId ON dev_iecg.user_tag_relations("userId");
CREATE INDEX IF NOT EXISTS idx_user_tag_relations_tagId ON dev_iecg.user_tag_relations("tagId");
CREATE INDEX IF NOT EXISTS idx_schedule_tag_relations_scheduleId ON dev_iecg.schedule_tag_relations("scheduleId");
CREATE INDEX IF NOT EXISTS idx_schedule_tag_relations_tagId ON dev_iecg.schedule_tag_relations("tagId");
CREATE INDEX IF NOT EXISTS idx_user_location_updates_userId ON dev_iecg.user_location_updates("userId");
CREATE INDEX IF NOT EXISTS idx_automatic_checkins_userId ON dev_iecg.automatic_checkins("userId");
CREATE INDEX IF NOT EXISTS idx_automatic_checkins_scheduleId ON dev_iecg.automatic_checkins("scheduleId");
CREATE INDEX IF NOT EXISTS idx_automatic_checkins_tagId ON dev_iecg.automatic_checkins("tagId");
