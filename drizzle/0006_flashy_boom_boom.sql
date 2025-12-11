CREATE TABLE `schedule_tag_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schedule_tag_relations_id` PRIMARY KEY(`id`)
);
