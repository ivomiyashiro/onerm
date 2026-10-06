CREATE TABLE `app_state` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`owner` text DEFAULT 'guest' NOT NULL,
	`pending_migration_uid` text,
	`onboarding_step` integer,
	`catalog_version` text,
	`rest_timer_ends_at` integer,
	`last_account_nudge_at` integer,
	`notification_permission_asked` integer DEFAULT false NOT NULL,
	CONSTRAINT "app_state_single_row_check" CHECK("app_state"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`aliases` text NOT NULL,
	`load_type` text NOT NULL,
	`primary_muscles` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`primary_equipment` text NOT NULL,
	`equipment` text NOT NULL,
	`mechanic` text NOT NULL,
	`is_unilateral` integer NOT NULL,
	`description` text,
	`attributions` text NOT NULL,
	`deprecated_at` integer,
	CONSTRAINT "exercises_load_type_check" CHECK("exercises"."load_type" in ('external', 'bodyweight')),
	CONSTRAINT "exercises_primary_equipment_check" CHECK("exercises"."primary_equipment" in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell')),
	CONSTRAINT "exercises_mechanic_check" CHECK("exercises"."mechanic" in ('compound', 'isolation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_slug_idx` ON `exercises` (`slug`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`level` text NOT NULL,
	`goal` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`unit` text NOT NULL,
	`effort_mode` text NOT NULL,
	`effort_mode_explicit` integer NOT NULL,
	`load_increments_kg` text NOT NULL,
	`load_increments_lb` text NOT NULL,
	`bar_weight_kg` real NOT NULL,
	`bar_weight_lb` real NOT NULL,
	`active_routine_id` text,
	`onboarding_completed_at` integer,
	CONSTRAINT "profiles_level_check" CHECK("profiles"."level" in ('novice', 'intermediate', 'advanced')),
	CONSTRAINT "profiles_goal_check" CHECK("profiles"."goal" in ('health', 'hypertrophy', 'strength')),
	CONSTRAINT "profiles_unit_check" CHECK("profiles"."unit" in ('kg', 'lb')),
	CONSTRAINT "profiles_effort_mode_check" CHECK("profiles"."effort_mode" in ('simple', 'rir')),
	CONSTRAINT "profiles_days_per_week_check" CHECK("profiles"."days_per_week" between 2 and 6)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_one_live_idx` ON `profiles` ((1)) WHERE "profiles"."deleted_at" is null;--> statement-breakpoint
CREATE TABLE `routine_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`routine_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routine_days_routine_idx` ON `routine_days` (`routine_id`);--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`routine_day_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`role` text NOT NULL,
	`sets` integer NOT NULL,
	`rep_min` integer NOT NULL,
	`rep_max` integer NOT NULL,
	`rest_seconds` integer NOT NULL,
	`target_rir` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`routine_day_id`) REFERENCES `routine_days`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "routine_exercises_role_check" CHECK("routine_exercises"."role" in ('main', 'accessory')),
	CONSTRAINT "routine_exercises_sets_check" CHECK("routine_exercises"."sets" between 1 and 10),
	CONSTRAINT "routine_exercises_rep_min_check" CHECK("routine_exercises"."rep_min" between 1 and 30),
	CONSTRAINT "routine_exercises_rep_max_check" CHECK("routine_exercises"."rep_max" between "routine_exercises"."rep_min" and 30),
	CONSTRAINT "routine_exercises_rest_seconds_check" CHECK("routine_exercises"."rest_seconds" between 30 and 600 and "routine_exercises"."rest_seconds" % 15 = 0),
	CONSTRAINT "routine_exercises_target_rir_check" CHECK("routine_exercises"."target_rir" between 0 and 5)
);
--> statement-breakpoint
CREATE INDEX `routine_exercises_day_idx` ON `routine_exercises` (`routine_day_id`);--> statement-breakpoint
CREATE TABLE `routine_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`estimated_minutes` integer NOT NULL,
	`rationale` text NOT NULL,
	CONSTRAINT "routine_templates_level_check" CHECK("routine_templates"."level" in ('novice', 'intermediate', 'advanced'))
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`name` text NOT NULL,
	`source_template_id` text,
	CONSTRAINT "routines_name_check" CHECK(length(trim("routines"."name")) between 1 and 50)
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`table_name` text PRIMARY KEY NOT NULL,
	`cursor` text,
	`last_success_at` integer,
	`restore_completed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `template_days` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `routine_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `template_days_template_idx` ON `template_days` (`template_id`);--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`template_day_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`role` text NOT NULL,
	`sets` integer NOT NULL,
	FOREIGN KEY (`template_day_id`) REFERENCES `template_days`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "template_exercises_role_check" CHECK("template_exercises"."role" in ('main', 'accessory')),
	CONSTRAINT "template_exercises_sets_check" CHECK("template_exercises"."sets" between 1 and 10)
);
--> statement-breakpoint
CREATE INDEX `template_exercises_day_idx` ON `template_exercises` (`template_day_id`);--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`workout_id` text NOT NULL,
	`routine_exercise_id` text,
	`planned_exercise_id` text,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`status` text NOT NULL,
	`role` text NOT NULL,
	`sets` integer NOT NULL,
	`rep_min` integer NOT NULL,
	`rep_max` integer NOT NULL,
	`rest_seconds` integer NOT NULL,
	`target_rir` integer NOT NULL,
	`load_type` text NOT NULL,
	`is_unilateral` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "workout_exercises_status_check" CHECK("workout_exercises"."status" in ('pending', 'done', 'skipped')),
	CONSTRAINT "workout_exercises_load_type_check" CHECK("workout_exercises"."load_type" in ('external', 'bodyweight')),
	CONSTRAINT "workout_exercises_role_check" CHECK("workout_exercises"."role" in ('main', 'accessory')),
	CONSTRAINT "workout_exercises_sets_check" CHECK("workout_exercises"."sets" between 1 and 10),
	CONSTRAINT "workout_exercises_rep_min_check" CHECK("workout_exercises"."rep_min" between 1 and 30),
	CONSTRAINT "workout_exercises_rep_max_check" CHECK("workout_exercises"."rep_max" between "workout_exercises"."rep_min" and 30),
	CONSTRAINT "workout_exercises_rest_seconds_check" CHECK("workout_exercises"."rest_seconds" between 30 and 600 and "workout_exercises"."rest_seconds" % 15 = 0),
	CONSTRAINT "workout_exercises_target_rir_check" CHECK("workout_exercises"."target_rir" between 0 and 5)
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_exercises_exercise_idx` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`workout_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`load_kg` real,
	`reps` integer,
	`rir` integer,
	`reps_left` integer,
	`reps_right` integer,
	`rir_left` integer,
	`rir_right` integer,
	`is_warmup` integer NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "workout_sets_laterality_check" CHECK(("workout_sets"."reps" is not null and "workout_sets"."reps_left" is null and "workout_sets"."reps_right" is null and "workout_sets"."rir_left" is null and "workout_sets"."rir_right" is null)
        or ("workout_sets"."reps" is null and "workout_sets"."rir" is null and "workout_sets"."reps_left" is not null and "workout_sets"."reps_right" is not null)),
	CONSTRAINT "workout_sets_load_kg_check" CHECK("workout_sets"."load_kg" is null or "workout_sets"."load_kg" between 0 and 1000),
	CONSTRAINT "workout_sets_reps_check" CHECK("workout_sets"."reps" is null or "workout_sets"."reps" between 0 and 100),
	CONSTRAINT "workout_sets_reps_left_check" CHECK("workout_sets"."reps_left" is null or "workout_sets"."reps_left" between 0 and 100),
	CONSTRAINT "workout_sets_reps_right_check" CHECK("workout_sets"."reps_right" is null or "workout_sets"."reps_right" between 0 and 100),
	CONSTRAINT "workout_sets_rir_check" CHECK("workout_sets"."rir" is null or "workout_sets"."rir" between 0 and 5),
	CONSTRAINT "workout_sets_rir_left_check" CHECK("workout_sets"."rir_left" is null or "workout_sets"."rir_left" between 0 and 5),
	CONSTRAINT "workout_sets_rir_right_check" CHECK("workout_sets"."rir_right" is null or "workout_sets"."rir_right" between 0 and 5)
);
--> statement-breakpoint
CREATE INDEX `workout_sets_workout_exercise_idx` ON `workout_sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`server_updated_at` integer,
	`_dirty` integer DEFAULT true NOT NULL,
	`_conflict` text,
	`routine_id` text,
	`routine_day_id` text,
	`routine_name_snapshot` text NOT NULL,
	`day_name_snapshot` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`notes` text,
	CONSTRAINT "workouts_status_check" CHECK("workouts"."status" in ('in_progress', 'finished'))
);
--> statement-breakpoint
CREATE INDEX `workouts_started_at_idx` ON `workouts` (`started_at`);