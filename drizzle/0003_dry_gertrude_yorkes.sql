CREATE TABLE `automatic_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`tagId` int NOT NULL,
	`nfcUserId` int NOT NULL,
	`userLatitude` varchar(32),
	`userLongitude` varchar(32),
	`distanceMeters` int,
	`isWithinRadius` boolean NOT NULL DEFAULT false,
	`scheduledDate` timestamp NOT NULL,
	`periodStart` varchar(8) NOT NULL,
	`periodEnd` varchar(8) NOT NULL,
	`checkinTime` timestamp NOT NULL,
	`status` enum('pending','completed','failed','missed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automatic_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checkin_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tagId` int NOT NULL,
	`name` varchar(255),
	`description` text,
	`daysOfWeek` varchar(32) NOT NULL,
	`startTime` varchar(8) NOT NULL,
	`endTime` varchar(8) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`timezone` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkin_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_location_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nfcUserId` int NOT NULL,
	`latitude` varchar(32) NOT NULL,
	`longitude` varchar(32) NOT NULL,
	`accuracy` int,
	`deviceInfo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_location_updates_id` PRIMARY KEY(`id`)
);
