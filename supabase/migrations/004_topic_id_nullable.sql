-- ==============================================
-- Migration: Make topic_id nullable in exercises and student_progress
-- Date: 2026-03-01
-- Description: Sau khi refactor sang units/lessons, topic_id không còn
--              bắt buộc. Bỏ NOT NULL để exercises mới chỉ cần lesson_id.
-- ==============================================

-- exercises: bỏ NOT NULL trên topic_id
ALTER TABLE public.exercises
  ALTER COLUMN topic_id DROP NOT NULL;

-- student_progress: bỏ NOT NULL trên topic_id (nếu có)
ALTER TABLE public.student_progress
  ALTER COLUMN topic_id DROP NOT NULL;
