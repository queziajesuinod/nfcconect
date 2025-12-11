CREATE TABLE `checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tagId` int NOT NULL,
	`nfcUserId` int NOT NULL,
	`latitude` varchar(32) NOT NULL,
	`longitude` varchar(32) NOT NULL,
	`distanceMeters` int,
	`isWithinRadius` boolean NOT NULL DEFAULT false,
	`deviceInfo` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `connection_logs` MODIFY COLUMN `action` enum('first_read','validation','redirect','update','block','checkin') NOT NULL;--> statement-breakpoint
ALTER TABLE `connection_logs` ADD `latitude` varchar(32);--> statement-breakpoint
ALTER TABLE `connection_logs` ADD `longitude` varchar(32);--> statement-breakpoint
ALTER TABLE `nfc_tags` ADD `latitude` varchar(32);--> statement-breakpoint
ALTER TABLE `nfc_tags` ADD `longitude` varchar(32);--> statement-breakpoint
ALTER TABLE `nfc_tags` ADD `radiusMeters` int DEFAULT 100;--> statement-breakpoint
ALTER TABLE `nfc_tags` ADD `enableCheckin` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `nfc_users` ADD `registrationLatitude` varchar(32);--> statement-breakpoint
ALTER TABLE `nfc_users` ADD `registrationLongitude` varchar(32);