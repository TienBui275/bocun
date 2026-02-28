-- ==============================================
-- Migration: Add correct_answer to exercises
-- Date: 2026-02-28
-- Description: Thêm cột correct_answer vào bảng exercises
--              để xử lý loại câu hỏi fill_blank không cần
--              join sang bảng exercise_options
-- ==============================================

-- Thêm cột correct_answer vào exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS correct_answer TEXT;

-- Comment mô tả cách dùng:
-- - multiple_choice / true_false: correct_answer = NULL
--   (đáp án đúng xác định qua exercise_options.is_correct = true)
-- - fill_blank: correct_answer = chuỗi đáp án đúng, VD: '7', 'Hà Nội', 'cat'
--   (có thể lưu nhiều đáp án chấp nhận được, phân tách bằng '|', VD: 'seven|7')

COMMENT ON COLUMN public.exercises.correct_answer IS
  'Dành cho fill_blank: chuỗi đáp án đúng. Có thể dùng | để phân tách nhiều đáp án chấp nhận được (VD: "seven|7"). NULL nếu là multiple_choice hoặc true_false.';
