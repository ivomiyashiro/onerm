CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`workout_id` text NOT NULL,
	`position` integer NOT NULL,
	`load_kg` real,
	`reps` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "workout_sets_reps_check" CHECK("workout_sets"."reps" between 0 and 100)
);
--> statement-breakpoint
CREATE INDEX `workout_sets_workout_idx` ON `workout_sets` (`workout_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`routine_name_snapshot` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	CONSTRAINT "workouts_status_check" CHECK("workouts"."status" in ('in_progress', 'finished'))
);
