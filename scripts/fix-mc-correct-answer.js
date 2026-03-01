// Fix exercise 35: set correct_answer = NULL (multiple_choice dùng exercise_options.is_correct, không dùng correct_answer)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oehylgyeplocedqcuyza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM'
);

async function run() {
  // Kiểm tra trước
  const { data: before } = await supabase
    .from('exercises')
    .select('id, question_type, correct_answer')
    .eq('id', 35)
    .single();
  console.log('Trước:', before);

  // Fix: set correct_answer = NULL cho tất cả multiple_choice và true_false
  const { data, error } = await supabase
    .from('exercises')
    .update({ correct_answer: null })
    .in('question_type', ['multiple_choice', 'true_false'])
    .select('id, question_type, correct_answer');

  if (error) {
    console.error('Lỗi:', error.message);
    return;
  }

  console.log('Đã fix:', data);
  console.log('\n✅ correct_answer = NULL cho tất cả multiple_choice/true_false exercises.');
  console.log('   Đáp án đúng được xác định qua exercise_options.is_correct = true.');
}

run().catch(console.error);
