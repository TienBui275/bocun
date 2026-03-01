// Script kiểm tra và bổ sung dữ liệu exercises trong Supabase
// Usage: node scripts/check-exercises.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oehylgyeplocedqcuyza.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkExercises() {
  console.log('====================================');
  console.log('KIỂM TRA EXERCISES TRONG DATABASE');
  console.log('====================================\n');

  // 1. Lấy tất cả exercises
  const { data: exercises, error: exErr } = await supabase
    .from('exercises')
    .select(`
      id, lesson_id, question, question_type,
      correct_answer, explanation, hint,
      image_url, audio_url, order_index,
      difficulty, points, is_active
    `)
    .order('id');

  if (exErr) {
    console.error('Lỗi khi lấy exercises:', exErr.message);
    return;
  }

  console.log(`Tổng số exercises: ${exercises.length}\n`);

  // 2. Lấy tất cả exercise_options
  const { data: options, error: optErr } = await supabase
    .from('exercise_options')
    .select('exercise_id, option_label, option_text, is_correct, order_index')
    .order('exercise_id, order_index');

  if (optErr) {
    console.error('Lỗi khi lấy options:', optErr.message);
    return;
  }

  // Map options theo exercise_id
  const optionMap = {};
  for (const opt of options) {
    if (!optionMap[opt.exercise_id]) optionMap[opt.exercise_id] = [];
    optionMap[opt.exercise_id].push(opt);
  }

  // 3. Phân tích từng exercise
  const issues = {
    missingHint: [],
    missingExplanation: [],
    missingCorrectAnswer: [],  // fill_blank không có correct_answer
    missingOptions: [],        // multiple_choice/true_false không có options
    missingCorrectOption: [],  // options không có is_correct = true
    noLessonId: [],
  };

  for (const ex of exercises) {
    // Kiểm tra lesson_id
    if (!ex.lesson_id) issues.noLessonId.push(ex.id);

    // Kiểm tra hint
    if (!ex.hint || ex.hint.trim() === '') issues.missingHint.push(ex.id);

    // Kiểm tra explanation
    if (!ex.explanation || ex.explanation.trim() === '') issues.missingExplanation.push(ex.id);

    // Kiểm tra correct_answer cho fill_blank
    if (ex.question_type === 'fill_blank') {
      if (!ex.correct_answer || ex.correct_answer.trim() === '') {
        issues.missingCorrectAnswer.push(ex.id);
      }
    }

    // Kiểm tra options cho multiple_choice và true_false
    if (ex.question_type === 'multiple_choice' || ex.question_type === 'true_false') {
      const exOptions = optionMap[ex.id] || [];
      if (exOptions.length === 0) {
        issues.missingOptions.push(ex.id);
      } else {
        // Kiểm tra xem có đáp án đúng không
        const hasCorrect = exOptions.some(o => o.is_correct === true);
        if (!hasCorrect) issues.missingCorrectOption.push(ex.id);
      }
    }
  }

  // 4. Báo cáo
  console.log('📊 KẾT QUẢ KIỂM TRA:');
  console.log('-----------------------------------');
  console.log(`❌ Thiếu hint:           ${issues.missingHint.length} exercises`);
  if (issues.missingHint.length > 0) console.log(`   IDs: ${issues.missingHint.join(', ')}`);

  console.log(`❌ Thiếu explanation:    ${issues.missingExplanation.length} exercises`);
  if (issues.missingExplanation.length > 0) console.log(`   IDs: ${issues.missingExplanation.join(', ')}`);

  console.log(`❌ Thiếu correct_answer: ${issues.missingCorrectAnswer.length} fill_blank exercises`);
  if (issues.missingCorrectAnswer.length > 0) console.log(`   IDs: ${issues.missingCorrectAnswer.join(', ')}`);

  console.log(`❌ Thiếu options:        ${issues.missingOptions.length} multiple_choice/true_false exercises`);
  if (issues.missingOptions.length > 0) console.log(`   IDs: ${issues.missingOptions.join(', ')}`);

  console.log(`❌ Options thiếu đáp án đúng: ${issues.missingCorrectOption.length} exercises`);
  if (issues.missingCorrectOption.length > 0) console.log(`   IDs: ${issues.missingCorrectOption.join(', ')}`);

  console.log(`❌ Không có lesson_id:   ${issues.noLessonId.length} exercises`);
  if (issues.noLessonId.length > 0) console.log(`   IDs: ${issues.noLessonId.join(', ')}`);
  
  // 5. In chi tiết từng exercise có vấn đề
  const problematic = new Set([
    ...issues.missingHint,
    ...issues.missingExplanation,
    ...issues.missingCorrectAnswer,
    ...issues.missingOptions,
    ...issues.missingCorrectOption,
  ]);

  if (problematic.size > 0) {
    console.log(`\n📋 CHI TIẾT ${problematic.size} EXERCISES CÓ VẤN ĐỀ:`);
    console.log('===================================');

    for (const ex of exercises) {
      if (!problematic.has(ex.id)) continue;
      const exOpts = optionMap[ex.id] || [];

      console.log(`\n[ID: ${ex.id}] ${ex.question_type.toUpperCase()} | lesson_id: ${ex.lesson_id}`);
      console.log(`  Question: ${ex.question.substring(0, 80)}${ex.question.length > 80 ? '...' : ''}`);
      console.log(`  hint:          ${ex.hint ? '✅ ' + ex.hint.substring(0, 50) : '❌ MISSING'}`);
      console.log(`  explanation:   ${ex.explanation ? '✅ ' + ex.explanation.substring(0, 50) : '❌ MISSING'}`);
      if (ex.question_type === 'fill_blank') {
        console.log(`  correct_answer:${ex.correct_answer ? '✅ ' + ex.correct_answer : '❌ MISSING'}`);
      }
      if (ex.question_type === 'multiple_choice' || ex.question_type === 'true_false') {
        if (exOpts.length === 0) {
          console.log(`  options:       ❌ NO OPTIONS`);
        } else {
          const correct = exOpts.filter(o => o.is_correct);
          console.log(`  options:       ✅ ${exOpts.length} options (${correct.length > 0 ? '✅ has correct' : '❌ NO CORRECT OPTION'})`);
          exOpts.forEach(o => console.log(`    ${o.is_correct ? '✅' : '  '} ${o.option_label}: ${o.option_text}`));
        }
      }
    }
  } else {
    console.log('\n✅ Tất cả exercises đều đầy đủ dữ liệu!');
  }

  // 6. Thống kê theo lesson
  const { data: lessons, error: lesErr } = await supabase
    .from('lessons')
    .select(`
      id, title, lesson_number,
      unit:units(title, grade:grades(name))
    `)
    .order('id');

  if (!lesErr && lessons) {
    console.log('\n📚 PHÂN BỐ EXERCISES THEO LESSON:');
    console.log('===================================');
    for (const lesson of lessons) {
      const lessonExercises = exercises.filter(e => e.lesson_id === lesson.id);
      const gradeName = lesson.unit?.grade?.name ?? '?';
      const unitTitle = lesson.unit?.title ?? '?';
      console.log(`  [Lesson ${lesson.id}] ${gradeName} | ${unitTitle} | ${lesson.lesson_number} ${lesson.title}: ${lessonExercises.length} exercises`);
    }
  }

  return { exercises, optionMap, issues };
}

checkExercises().catch(console.error);
