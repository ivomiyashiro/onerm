DROP INDEX `workout_exercises_workout_idx`;--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workout_id`,`updated_at`,`id`);--> statement-breakpoint
DROP INDEX `workout_sets_workout_exercise_idx`;--> statement-breakpoint
CREATE INDEX `workout_sets_workout_exercise_idx` ON `workout_sets` (`workout_exercise_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `workouts_status_updated_idx` ON `workouts` (`status`,`updated_at`);