CREATE TABLE `connection_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tagId` int NOT NULL,
	`nfcUserId` int,
	`action` enum('first_read','validation','redirect','update','block') NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connection_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dynamic_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nfcUserId` int NOT NULL,
	`shortCode` varchar(32) NOT NULL,
	`targetUrl` text NOT NULL,
	`title` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`clickCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dynamic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `dynamic_links_shortCode_unique` UNIQUE(`shortCode`)
);
--> statement-breakpoint
CREATE TABLE `nfc_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uid` varchar(64) NOT NULL,
	`name` varchar(255),
	`description` text,
	`status` enum('active','inactive','blocked') NOT NULL DEFAULT 'active',
	`redirectUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfc_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `nfc_tags_uid_unique` UNIQUE(`uid`)
);
--> statement-breakpoint
CREATE TABLE `nfc_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tagId` int NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`phone` varchar(32),
	`deviceInfo` text,
	`ipAddress` varchar(64),
	`userAgent` text,
	`isValidated` boolean NOT NULL DEFAULT false,
	`firstConnectionAt` timestamp NOT NULL DEFAULT (now()),
	`lastConnectionAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfc_users_id` PRIMARY KEY(`id`)
);
