-- Migration: Add groupId to dynamic_links table
-- Date: 2025-12-17
-- Description: Allow dynamic links to be associated with groups instead of individual users

-- Add groupId column (nullable)
ALTER TABLE "dynamic_links" ADD COLUMN "groupId" INTEGER;

-- Make nfcUserId nullable (since links can be for groups OR users)
ALTER TABLE "dynamic_links" ALTER COLUMN "nfcUserId" DROP NOT NULL;

-- Add check constraint to ensure either nfcUserId OR groupId is set (but not both)
ALTER TABLE "dynamic_links" ADD CONSTRAINT "dynamic_links_user_or_group_check" 
  CHECK (
    (nfcUserId IS NOT NULL AND groupId IS NULL) OR 
    (nfcUserId IS NULL AND groupId IS NOT NULL)
  );
