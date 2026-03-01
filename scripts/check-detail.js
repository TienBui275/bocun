const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oehylgyeplocedqcuyza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM'
);

async function run() {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, question, question_type, correct_answer, explanation, hint, lesson_id')
    .in('id', [1, 2, 3, 4, 5]);

  if (error) { console.error(error); return; }

  data.forEach(e => {
    console.log('ID:', e.id);
    console.log('  Q:', e.question.substring(0, 100));
    console.log('  Type:', e.question_type);
    console.log('  lesson_id:', e.lesson_id);
    console.log('  hint:', e.hint);
    console.log('  explanation:', e.explanation ? e.explanation.substring(0, 80) : null);
    console.log('  correct_answer:', e.correct_answer);
    console.log();
  });

  // Check exercise 35
  const { data: ex35 } = await supabase
    .from('exercises')
    .select('id, question, question_type, explanation, hint')
    .eq('id', 35)
    .single();

  if (ex35) {
    console.log('=== Exercise 35 (MULTIPLE_CHOICE - MISSING OPTIONS) ===');
    console.log('Q:', ex35.question);
    console.log('explanation:', ex35.explanation);
  }
}

run().catch(console.error);
