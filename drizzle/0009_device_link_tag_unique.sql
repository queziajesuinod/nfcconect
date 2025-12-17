-- Allow multiple target overrides per device by dropping the old unique device index
ALTER TABLE dev_iecg.device_link_activations DROP CONSTRAINT IF EXISTS device_link_activations_deviceid_key;
DROP INDEX IF EXISTS device_link_activations_device_tag_unique;

-- Create a new unique index on the device/tag combination so ON CONFLICT can target both columns
CREATE UNIQUE INDEX device_link_activations_device_tag_unique
  ON dev_iecg.device_link_activations ("deviceId", "tagId");
