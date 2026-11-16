CREATE TABLE `prep_done` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`household_id` text NOT NULL,
	`meal_id` text,
	`task_key` text NOT NULL,
	`done_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prep_done_uq` ON `prep_done` (`household_id`,`task_key`);--> statement-breakpoint
CREATE INDEX `prep_done_meal_idx` ON `prep_done` (`meal_id`);--> statement-breakpoint
ALTER TABLE `ingredients` ADD `staple` integer;--> statement-breakpoint
-- Meals no longer need accepting. Past meals that were never accepted are closed as they are, so the first read
-- after this release does not write serving history or use pantry stock for meals that may never have happened.
UPDATE `meals` SET `settled_at` = CAST(strftime('%s', 'now') AS INTEGER) * 1000 WHERE `status` = 'draft' AND `settled_at` IS NULL AND `date` < date('now');
