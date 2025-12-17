-- Ensure (deviceId, tagId) is unique for all overrides with a tag
DROP INDEX IF EXISTS device_link_activations_device_tag_unique;
CREATE UNIQUE INDEX device_link_activations_device_tag_unique
  ON dev_iecg.device_link_activations ("deviceId", "tagId");

-- Allow only one general override per device (tagId IS NULL)
DROP INDEX IF EXISTS device_link_activations_device_null_unique;
CREATE UNIQUE INDEX device_link_activations_device_null_unique
  ON dev_iecg.device_link_activations ("deviceId")
  WHERE "tagId" IS NULL;
