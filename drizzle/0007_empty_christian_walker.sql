CREATE TABLE `group_schedule_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`scheduleId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_schedule_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_user_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`nfcUserId` int NOT NULL,
	`addedBy` enum('auto','manual') NOT NULL DEFAULT 'auto',
	`sourceScheduleId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_user_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`redirectUrl` text,
	`color` varchar(7) NOT NULL DEFAULT '#3B82F6',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_groups_id` PRIMARY KEY(`id`)
);
