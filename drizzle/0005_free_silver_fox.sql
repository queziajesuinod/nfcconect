CREATE TABLE `user_tag_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tagId` int NOT NULL,
	`firstConnectionAt` timestamp NOT NULL DEFAULT (now()),
	`lastConnectionAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_tag_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `nfc_users` ADD CONSTRAINT `nfc_users_deviceId_unique` UNIQUE(`deviceId`);--> statement-breakpoint
ALTER TABLE `nfc_users` DROP COLUMN `tagId`;