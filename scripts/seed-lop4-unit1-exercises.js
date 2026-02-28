const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// 5 exercises for Lesson 1.1: Counting and Sequences
// Grade 4 (lop-4) – Subject: Toán
// Type: fill_blank – correct_answer stored directly on exercise
// Difficulty increases from 1 → 3
// ============================================================
const EXERCISES = [
  // ----------------------------------------------------------
  // Q1 – Difficulty 1: step +10, find first > 100
  // Sequence: 5, 15, 25, … all end in 5
  // Answer: 105
  // ----------------------------------------------------------
  {
    question:
      'The numbers in this sequence increase by 10 each time.\n' +
      '5 → 15 → 25 → 35 → …\n' +
      'What is the first number greater than 100 that is in the sequence?',
    question_type: 'fill_blank',
    correct_answer: '105',
    explanation:
      'Write down the first few terms:\n' +
      '5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, …\n\n' +
      'All terms end in 5, so the first number greater than 100 is 105.',
    hint: 'All the terms in this sequence end in the same digit. What is it?',
    order_index: 1,
    difficulty: 1,
    points: 10,
  },

  // ----------------------------------------------------------
  // Q2 – Difficulty 1: step +20, find first > 200
  // Sequence: 15, 35, 55, … terms end in 15 or 35 alternately
  // Answer: 215
  // ----------------------------------------------------------
  {
    question:
      'The numbers in this sequence increase by 20 each time.\n' +
      '15 → 35 → 55 → 75 → …\n' +
      'What is the first number greater than 200 that is in the sequence?',
    question_type: 'fill_blank',
    correct_answer: '215',
    explanation:
      'Write down terms near 200:\n' +
      '…, 155, 175, 195, 215, …\n\n' +
      'The terms alternate between ending in 15 and 95 (mod 20 remainder = 15).\n' +
      'The first term greater than 200 is 215.',
    hint: 'Each term is 15 more than a multiple of 20.',
    order_index: 2,
    difficulty: 1,
    points: 10,
  },

  // ----------------------------------------------------------
  // Q3 – Difficulty 2: step +50, find first > 500
  // Sequence: 35, 85, 135, … terms end in 35 or 85
  // Answer: 535
  // ----------------------------------------------------------
  {
    question:
      'The numbers in this sequence increase by 50 each time.\n' +
      '35 → 85 → 135 → 185 → …\n' +
      'What is the first number greater than 500 that is in the sequence?',
    question_type: 'fill_blank',
    correct_answer: '535',
    explanation:
      'List terms near 500:\n' +
      '…, 385, 435, 485, 535, …\n\n' +
      'All terms end in 35 or 85, so you can spot them quickly.\n' +
      'The first term greater than 500 is 535.',
    hint: 'Write down the last few terms before 500. What comes next?',
    order_index: 3,
    difficulty: 2,
    points: 15,
  },

  // ----------------------------------------------------------
  // Q4 – Difficulty 2: step +75, find first > 1000
  // Sequence: 25, 100, 175, 250, … terms increase by 75
  // 25 + 75×13 = 25 + 975 = 1000  →  next: 1075
  // Answer: 1075
  // ----------------------------------------------------------
  {
    question:
      'The numbers in this sequence increase by 75 each time.\n' +
      '25 → 100 → 175 → 250 → …\n' +
      'What is the first number greater than 1000 that is in the sequence?',
    question_type: 'fill_blank',
    correct_answer: '1075',
    explanation:
      'Instead of listing every term, notice:\n' +
      '1000 ÷ 75 ≈ 13.3, so after about 13 steps from 25 we pass 1000.\n\n' +
      '25 + 75 × 13 = 25 + 975 = 1000  (this equals 1000, not greater)\n' +
      '25 + 75 × 14 = 25 + 1050 = 1075  ✓\n\n' +
      'The first term greater than 1000 is 1075.',
    hint: 'Try dividing 1000 by 75 to estimate how many steps you need from 25.',
    order_index: 4,
    difficulty: 2,
    points: 15,
  },

  // ----------------------------------------------------------
  // Q5 – Difficulty 3: step +150, find first > 2000
  // Sequence: 70, 220, 370, 520, … 
  // 70 + 150×13 = 70 + 1950 = 2020 … wait, need first > 2000
  // 70 + 150n > 2000 → n > 12.87 → n = 13 → 70 + 1950 = 2020
  // Answer: 2020
  // ----------------------------------------------------------
  {
    question:
      'The numbers in this sequence increase by 150 each time.\n' +
      '70 → 220 → 370 → 520 → …\n' +
      'What is the first number greater than 2000 that is in the sequence?',
    question_type: 'fill_blank',
    correct_answer: '2020',
    explanation:
      'Find how many steps from 70 are needed to exceed 2000:\n\n' +
      '70 + 150 × n > 2000\n' +
      '150 × n > 1930\n' +
      'n > 12.87  →  n = 13\n\n' +
      '70 + 150 × 13 = 70 + 1950 = 2020  ✓\n\n' +
      'You can verify: the previous term is 70 + 150 × 12 = 70 + 1800 = 1870, which is less than 2000.\n' +
      'The first term greater than 2000 is 2020.',
    hint: 'Set up the inequality: 70 + 150 × n > 2000, then solve for n.',
    order_index: 5,
    difficulty: 3,
    points: 20,
  },
]

async function seedExercises() {
  console.log('🌱 Seed bài tập: Lớp 4 – Toán – Unit 1 – Lesson 1.1 Counting and Sequences\n')

  // ── 1. Tìm Unit 1 của Lớp 4, Toán ──────────────────────────
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, title')
    .eq('grade_id', 6)      // lop-4
    .eq('subject_id', 1)    // toan
    .eq('unit_number', 1)
    .single()

  if (unitError || !unit) {
    console.error('❌ Không tìm thấy Unit 1 – Lớp 4 – Toán.')
    console.error('   Hãy chạy seed-lop4-toan.js trước.')
    process.exit(1)
  }
  console.log(`✅ Unit: ${unit.title} (id=${unit.id})`)

  // ── 2. Tìm Lesson 1.1 trong unit đó ─────────────────────────
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, exercise_count')
    .eq('unit_id', unit.id)
    .eq('slug', 'counting-and-sequences')
    .single()

  if (lessonError || !lesson) {
    console.error('❌ Không tìm thấy Lesson 1.1 (counting-and-sequences).')
    console.error('   Hãy chạy seed-lop4-toan.js trước.')
    process.exit(1)
  }
  console.log(`✅ Lesson: ${lesson.title} (id=${lesson.id})\n`)

  // ── 3. Seed từng exercise ─────────────────────────────────────
  let successCount = 0

  for (const ex of EXERCISES) {
    // Check trùng: cùng lesson_id + order_index
    const { data: existing } = await supabase
      .from('exercises')
      .select('id')
      .eq('lesson_id', lesson.id)
      .eq('order_index', ex.order_index)
      .maybeSingle()

    if (existing) {
      console.log(`  ⏭️  Bài ${ex.order_index} đã tồn tại (id=${existing.id}), bỏ qua.`)
      successCount++
      continue
    }

    const { data: exercise, error: exError } = await supabase
      .from('exercises')
      .insert({ lesson_id: lesson.id, ...ex })
      .select()
      .single()

    if (exError) {
      console.error(`  ❌ Lỗi bài ${ex.order_index}:`, exError.message)
      continue
    }

    console.log(`  ✅ Q${exercise.order_index} [difficulty=${exercise.difficulty}] – ${exercise.question.split('\n')[0].slice(0, 60)}…`)
    console.log(`       correct_answer: "${exercise.correct_answer}"`)
    successCount++
  }

  // ── 4. Cập nhật exercise_count trên lesson ────────────────────
  const { error: updateError } = await supabase
    .from('lessons')
    .update({ exercise_count: successCount })
    .eq('id', lesson.id)

  if (updateError) {
    console.error('\n⚠️  Không cập nhật được exercise_count:', updateError.message)
  } else {
    console.log(`\n📊 Đã cập nhật exercise_count = ${successCount} cho lesson "${lesson.title}"`)
  }

  // ── 5. Cập nhật exercise_count trên grade_subjects ────────────
  const { data: gsRow } = await supabase
    .from('grade_subjects')
    .select('exercise_count')
    .eq('grade_id', 6)
    .eq('subject_id', 1)
    .single()

  if (gsRow !== null) {
    await supabase
      .from('grade_subjects')
      .update({ exercise_count: (gsRow.exercise_count || 0) + successCount })
      .eq('grade_id', 6)
      .eq('subject_id', 1)
    console.log('📊 Đã cập nhật grade_subjects.exercise_count')
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Hoàn tất! Đã seed ${successCount}/${EXERCISES.length} bài tập.`)
}

seedExercises()
  .then(() => process.exit(0))
  .catch((err) => { console.error('❌ Lỗi không mong đợi:', err.message); process.exit(1) })
