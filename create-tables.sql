-- Helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS dev_iecg;

-- Drop dependent objects so we can recreate cleanly.
DROP TABLE IF EXISTS
  dev_iecg.group_user_relations,
  dev_iecg.group_schedule_relations,
  dev_iecg.notification_groups,
  dev_iecg.schedule_tag_relations,
  dev_iecg.user_location_updates,
  dev_iecg.automatic_checkins,
  dev_iecg.checkin_schedules,
  dev_iecg.dynamic_links,
  dev_iecg.checkins,
  dev_iecg.connection_logs,
  dev_iecg.user_tag_relations,
  dev_iecg.nfc_users,
  dev_iecg.nfc_tags,
  dev_iecg.refresh_tokens,
  dev_iecg."Users",
  dev_iecg."Perfis"
CASCADE;

DROP TYPE IF EXISTS dev_iecg.added_by;
DROP TYPE IF EXISTS dev_iecg.checkin_status;
DROP TYPE IF EXISTS dev_iecg.action;
DROP TYPE IF EXISTS dev_iecg.nfc_status;

-- Enum types
CREATE TYPE dev_iecg.nfc_status AS ENUM ('active', 'inactive', 'blocked');
CREATE TYPE dev_iecg.action AS ENUM ('first_read', 'validation', 'redirect', 'update', 'block', 'checkin');
CREATE TYPE dev_iecg.checkin_status AS ENUM ('pending', 'completed', 'failed', 'missed');
CREATE TYPE dev_iecg.added_by AS ENUM ('auto', 'manual');

-- Perfis table
CREATE TABLE dev_iecg."Perfis" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao VARCHAR(255),
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Users table
CREATE TABLE dev_iecg."Users" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  "perfilId" UUID,
  "passwordHash" VARCHAR(255),
  salt VARCHAR(255),
  username VARCHAR(255),
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  telefone TEXT,
  cpf TEXT,
  endereco TEXT
);

CREATE INDEX "Users_email_idx" ON dev_iecg."Users"(email);
CREATE INDEX "Users_perfilId_idx" ON dev_iecg."Users"("perfilId");

-- Refresh tokens
CREATE TABLE dev_iecg.refresh_tokens (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "ipAddress" VARCHAR(64),
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_refresh_tokens_userId ON dev_iecg.refresh_tokens("userId");

-- NFC tags
CREATE TABLE dev_iecg.nfc_tags (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255),
  description TEXT,
  status dev_iecg.nfc_status DEFAULT 'active' NOT NULL,
  "redirectUrl" TEXT,
  latitude VARCHAR(32),
  longitude VARCHAR(32),
  "radiusMeters" INTEGER DEFAULT 100,
  "enableCheckin" BOOLEAN DEFAULT FALSE NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_nfc_tags_uid ON dev_iecg.nfc_tags(uid);

-- NFC users
CREATE TABLE dev_iecg.nfc_users (
  id SERIAL PRIMARY KEY,
  "deviceId" VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(320),
  phone VARCHAR(32),
  "deviceInfo" TEXT,
  "ipAddress" VARCHAR(64),
  "userAgent" TEXT,
  "registrationLatitude" VARCHAR(32),
  "registrationLongitude" VARCHAR(32),
  "isValidated" BOOLEAN DEFAULT FALSE NOT NULL,
  "firstConnectionAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "lastConnectionAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_nfc_users_email ON dev_iecg.nfc_users(email);

-- User-tag relations
CREATE TABLE dev_iecg.user_tag_relations (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "tagId" INTEGER NOT NULL,
  "firstConnectionAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "lastConnectionAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_tag_relations_userId ON dev_iecg.user_tag_relations("userId");
CREATE INDEX idx_user_tag_relations_tagId ON dev_iecg.user_tag_relations("tagId");

-- Connection logs
CREATE TABLE dev_iecg.connection_logs (
  id SERIAL PRIMARY KEY,
  "tagId" INTEGER NOT NULL,
  "nfcUserId" INTEGER,
  action dev_iecg.action NOT NULL,
  "ipAddress" VARCHAR(64),
  "userAgent" TEXT,
  latitude VARCHAR(32),
  longitude VARCHAR(32),
  metadata TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_connection_logs_tagId ON dev_iecg.connection_logs("tagId");

-- Check-ins
CREATE TABLE dev_iecg.checkins (
  id SERIAL PRIMARY KEY,
  "tagId" INTEGER NOT NULL,
  "nfcUserId" INTEGER NOT NULL,
  latitude VARCHAR(32) NOT NULL,
  longitude VARCHAR(32) NOT NULL,
  "distanceMeters" INTEGER,
  "isWithinRadius" BOOLEAN DEFAULT FALSE NOT NULL,
  "deviceInfo" TEXT,
  "ipAddress" VARCHAR(64),
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_checkins_nfcUserId ON dev_iecg.checkins("nfcUserId");
CREATE INDEX idx_checkins_nfcTagId ON dev_iecg.checkins("tagId");

-- Dynamic links
CREATE TABLE dev_iecg.dynamic_links (
  id SERIAL PRIMARY KEY,
  "nfcUserId" INTEGER NOT NULL,
  "shortCode" VARCHAR(32) NOT NULL UNIQUE,
  "targetUrl" TEXT NOT NULL,
  title VARCHAR(255),
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  "clickCount" INTEGER DEFAULT 0 NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_dynamic_links_shortCode ON dev_iecg.dynamic_links("shortCode");

-- Check-in schedules
CREATE TABLE dev_iecg.checkin_schedules (
  id SERIAL PRIMARY KEY,
  "tagId" INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  "daysOfWeek" VARCHAR(32) NOT NULL,
  "startTime" VARCHAR(8) NOT NULL,
  "endTime" VARCHAR(8) NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  timezone VARCHAR(64) DEFAULT 'America/Sao_Paulo' NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Automatic check-ins
CREATE TABLE dev_iecg.automatic_checkins (
  id SERIAL PRIMARY KEY,
  "scheduleId" INTEGER NOT NULL,
  "tagId" INTEGER NOT NULL,
  "nfcUserId" INTEGER NOT NULL,
  "userLatitude" VARCHAR(32),
  "userLongitude" VARCHAR(32),
  "distanceMeters" INTEGER,
  "isWithinRadius" BOOLEAN DEFAULT FALSE NOT NULL,
  "scheduledDate" TIMESTAMPTZ NOT NULL,
  "periodStart" VARCHAR(8) NOT NULL,
  "periodEnd" VARCHAR(8) NOT NULL,
  "checkinTime" TIMESTAMPTZ NOT NULL,
  status dev_iecg.checkin_status DEFAULT 'pending' NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_automatic_checkins_userId ON dev_iecg.automatic_checkins("nfcUserId");
CREATE INDEX idx_automatic_checkins_scheduleId ON dev_iecg.automatic_checkins("scheduleId");
CREATE INDEX idx_automatic_checkins_tagId ON dev_iecg.automatic_checkins("tagId");

-- User location updates
CREATE TABLE dev_iecg.user_location_updates (
  id SERIAL PRIMARY KEY,
  "nfcUserId" INTEGER NOT NULL,
  latitude VARCHAR(32) NOT NULL,
  longitude VARCHAR(32) NOT NULL,
  accuracy INTEGER,
  "deviceInfo" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_location_updates_userId ON dev_iecg.user_location_updates("nfcUserId");

-- Schedule-tag relations
CREATE TABLE dev_iecg.schedule_tag_relations (
  id SERIAL PRIMARY KEY,
  "scheduleId" INTEGER NOT NULL,
  "tagId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_schedule_tag_relations_scheduleId ON dev_iecg.schedule_tag_relations("scheduleId");
CREATE INDEX idx_schedule_tag_relations_tagId ON dev_iecg.schedule_tag_relations("tagId");

-- Notification groups
CREATE TABLE dev_iecg.notification_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "redirectUrl" TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6' NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Group-schedule relations
CREATE TABLE dev_iecg.group_schedule_relations (
  id SERIAL PRIMARY KEY,
  "groupId" INTEGER NOT NULL,
  "scheduleId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_group_schedule_relations_groupId ON dev_iecg.group_schedule_relations("groupId");
CREATE INDEX idx_group_schedule_relations_scheduleId ON dev_iecg.group_schedule_relations("scheduleId");

-- Group-user relations
CREATE TABLE dev_iecg.group_user_relations (
  id SERIAL PRIMARY KEY,
  "groupId" INTEGER NOT NULL,
  "nfcUserId" INTEGER NOT NULL,
  "addedBy" dev_iecg.added_by DEFAULT 'auto' NOT NULL,
  "sourceScheduleId" INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_group_user_relations_groupId ON dev_iecg.group_user_relations("groupId");
CREATE INDEX idx_group_user_relations_nfcUserId ON dev_iecg.group_user_relations("nfcUserId");
