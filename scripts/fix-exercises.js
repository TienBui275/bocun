// Script bổ sung dữ liệu còn thiếu trong bảng exercises
// Thực hiện:
//   1. Xóa exercises 1-5 (test data cũ, không có lesson_id)
//   2. Thêm options cho exercise 35 (multiple_choice thiếu options)
//   3. Thêm hint cho exercises 25-55

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oehylgyeplocedqcuyza.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =====================================================================
// HINTS CHO TỪng EXERCISE
// Lesson 7: Counting and sequences (IDs 25-41)
// Lesson 8: More on negative numbers (IDs 42-55)
// =====================================================================
const HINTS = {
  25: 'Add 100 to the starting number to find the next term.',
  26: 'Subtract 100 from the starting number to find the next term.',
  27: 'Add 1000 to the starting number to find the next term.',
  28: 'Subtract 1000 from the starting number to find the next term.',
  29: 'What comes after 0 when you keep counting backwards past zero?',
  30: 'Apply the "subtract 2" rule starting from 8 until you reach 0.',
  31: 'Start with a number that is already a multiple of 3 (e.g. 3, 6, 9...).',
  32: 'Try starting with a decimal or fractional number (e.g. 1.5).',
  33: 'Think: when you add 3 (odd) to an odd number, what do you always get?',
  34: 'Work backwards from 127: subtract 3 repeatedly to find a valid first term.',
  35: 'Is 397 exactly divisible by 3? Use division to check.',
  36: 'A linear sequence has the same difference between every pair of consecutive terms.',
  37: 'A linear sequence has the same (constant) difference between all terms.',
  38: 'Check whether the gap between each pair of consecutive terms stays the same.',
  39: 'In a non-linear sequence the differences between consecutive terms change each time.',
  40: 'Calculate each difference and see whether it stays constant or changes.',
  41: 'In a non-linear sequence the differences between consecutive terms are not equal.',
  42: 'Use a number line and count down 15 steps starting from 11.',
  43: 'Start at -5 on the number line and jump 1 step to the right.',
  44: 'Start at -2 on the number line and jump 4 steps to the left.',
  45: 'Start at -3 on the number line and jump 3 steps to the right.',
  46: 'Start at 6 on the number line and jump 9 steps to the left.',
  47: 'Count the number of steps from 0 to arrow A, and check which direction it points.',
  48: 'Count the number of steps from 0 to arrow B, and check which direction it points.',
  49: 'Count the number of steps from 0 to arrow C, and check which direction it points.',
  50: 'Count the number of steps from 0 to arrow D, and check which direction it points.',
  51: 'Numbers between -4 and 0 are negative: -3, -2, -1. Which letter is in that range?',
  52: 'Count the tick marks from the nearest labelled value to where arrow a points.',
  53: 'Count the tick marks from 0 downward (into negatives) to where arrow b points.',
  54: 'Count the tick marks upward from 10 to where arrow c points.',
  55: 'On a number line, the further left a number is, the colder (lower) the temperature.',
};

// =====================================================================
// OPTIONS CHO EXERCISE 35 (multiple_choice - chưa có options)
// Q: Is Abdul correct that subtracting 3 from 397 will eventually reach 0?
// Đáp án: No (397 mod 3 = 1, nên sẽ tới 1 chứ không phải 0)
// =====================================================================
const OPTIONS_35 = [
  { option_label: 'A', option_text: 'Yes, Abdul is correct', is_correct: false, order_index: 1 },
  { option_label: 'B', option_text: 'No, Abdul is not correct', is_correct: true, order_index: 2 },
];

async function run() {
  console.log('============================================');
  console.log('BỔ SUNG DỮ LIỆU EXERCISES - SUPABASE');
  console.log('============================================\n');

  // -------------------------------------------------------------------
  // BƯỚC 1: Xóa exercises 1-5 (test data cũ, không có lesson_id)
  // -------------------------------------------------------------------
  console.log('⚙️  Bước 1: Xóa exercises 1-5 (test data cũ)...');

  // Xóa options trước (exercise_options có FK tới exercises)
  const { error: delOptErr } = await supabase
    .from('exercise_options')
    .delete()
    .in('exercise_id', [1, 2, 3, 4, 5]);

  if (delOptErr) {
    console.error('  ❌ Lỗi xóa options của exercises 1-5:', delOptErr.message);
  } else {
    console.log('  ✅ Đã xóa options của exercises 1-5');
  }

  const { error: delExErr } = await supabase
    .from('exercises')
    .delete()
    .in('id', [1, 2, 3, 4, 5]);

  if (delExErr) {
    console.error('  ❌ Lỗi xóa exercises 1-5:', delExErr.message);
  } else {
    console.log('  ✅ Đã xóa exercises 1-5\n');
  }

  // -------------------------------------------------------------------
  // BƯỚC 2: Thêm options cho exercise 35
  // -------------------------------------------------------------------
  console.log('⚙️  Bước 2: Thêm options cho exercise 35...');

  const optionsToInsert = OPTIONS_35.map(opt => ({
    exercise_id: 35,
    ...opt,
  }));

  const { error: insOptErr } = await supabase
    .from('exercise_options')
    .insert(optionsToInsert);

  if (insOptErr) {
    console.error('  ❌ Lỗi thêm options cho exercise 35:', insOptErr.message);
  } else {
    console.log('  ✅ Đã thêm 2 options (Yes / No) cho exercise 35\n');
  }

  // -------------------------------------------------------------------
  // BƯỚC 3: Cập nhật hints cho exercises 25-55
  // -------------------------------------------------------------------
  console.log('⚙️  Bước 3: Cập nhật hints cho exercises 25-55...');

  let successCount = 0;
  let failCount = 0;

  for (const [idStr, hint] of Object.entries(HINTS)) {
    const id = parseInt(idStr);
    const { error } = await supabase
      .from('exercises')
      .update({ hint })
      .eq('id', id);

    if (error) {
      console.error(`  ❌ Exercise ${id}: ${error.message}`);
      failCount++;
    } else {
      successCount++;
    }
  }

  console.log(`  ✅ Đã cập nhật hint cho ${successCount} exercises`);
  if (failCount > 0) console.log(`  ❌ Thất bại: ${failCount} exercises`);

  // -------------------------------------------------------------------
  // BƯỚC 4: Kiểm tra lại sau khi cập nhật
  // -------------------------------------------------------------------
  console.log('\n============================================');
  console.log('KIỂM TRA LẠI SAU KHI CẬP NHẬT');
  console.log('============================================');

  const { data: exercises, error: verifyErr } = await supabase
    .from('exercises')
    .select('id, question_type, hint, explanation, correct_answer, lesson_id')
    .order('id');

  if (verifyErr) {
    console.error('Lỗi khi verify:', verifyErr.message);
    return;
  }

  const { data: allOptions } = await supabase
    .from('exercise_options')
    .select('exercise_id, is_correct');

  const optCountMap = {};
  const optHasCorrectMap = {};
  for (const o of allOptions || []) {
    optCountMap[o.exercise_id] = (optCountMap[o.exercise_id] || 0) + 1;
    if (o.is_correct) optHasCorrectMap[o.exercise_id] = true;
  }

  let issues = 0;
  for (const ex of exercises) {
    const problems = [];
    if (!ex.hint) problems.push('❌ hint');
    if (!ex.explanation) problems.push('❌ explanation');
    if (ex.question_type === 'fill_blank' && !ex.correct_answer) problems.push('❌ correct_answer');
    if (['multiple_choice', 'true_false'].includes(ex.question_type)) {
      if (!optCountMap[ex.id]) problems.push('❌ options');
      else if (!optHasCorrectMap[ex.id]) problems.push('❌ correct option');
    }
    if (!ex.lesson_id) problems.push('❌ lesson_id');

    if (problems.length > 0) {
      console.log(`[ID ${ex.id}] ${problems.join(', ')}`);
      issues++;
    }
  }

  if (issues === 0) {
    console.log(`\n✅ Tất cả ${exercises.length} exercises đều đầy đủ dữ liệu!`);
  } else {
    console.log(`\n⚠️  Còn ${issues} exercises có vấn đề.`);
  }

  console.log(`\nTổng số exercises hiện tại: ${exercises.length}`);
}

run().catch(console.error);
