// Fix exercise 35: set correct_answer = NULL (multiple_choice uses exercise_options.is_correct, not correct_answer)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oehylgyeplocedqcuyza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM'
);

async function run() {
  // Check before
  const { data: before } = await supabase
    .from('exercises')
    .select('id, question_type, correct_answer')
    .eq('id', 35)
    .single();
  console.log('Before:', before);

  // Fix: set correct_answer = NULL for all multiple_choice and true_false
  const { data, error } = await supabase
    .from('exercises')
    .update({ correct_answer: null })
    .in('question_type', ['multiple_choice', 'true_false'])
    .select('id, question_type, correct_answer');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Fixed:', data);
  console.log('\n✅ correct_answer = NULL for all multiple_choice/true_false exercises.');
  console.log('   Correct answer is determined via exercise_options.is_correct = true.');
}

run().catch(console.error);
