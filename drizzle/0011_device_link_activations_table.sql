CREATE TABLE IF NOT EXISTS dev_iecg.device_link_activations (
  id SERIAL PRIMARY KEY,
  "deviceId" varchar(255) NOT NULL,
  "linkId" integer NOT NULL,
  "nfcUserId" integer,
  "tagId" integer,
  "targetUrl" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS device_link_activations_device_tag_unique
  ON dev_iecg.device_link_activations ("deviceId", "tagId");

CREATE UNIQUE INDEX IF NOT EXISTS device_link_activations_device_null_unique
  ON dev_iecg.device_link_activations ("deviceId")
  WHERE "tagId" IS NULL;
