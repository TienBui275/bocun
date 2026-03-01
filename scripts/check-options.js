const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://oehylgyeplocedqcuyza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM'
);

async function run() {
  const { data: exs } = await supabase
    .from('exercises')
    .select('id, question, question_type, explanation, hint')
    .in('question_type', ['multiple_choice', 'true_false'])
    .order('id');

  const { data: opts } = await supabase
    .from('exercise_options')
    .select('exercise_id, option_label, option_text, is_correct, order_index')
    .order('exercise_id')
    .order('order_index');

  const optMap = {};
  for (const o of opts) {
    if (!optMap[o.exercise_id]) optMap[o.exercise_id] = [];
    optMap[o.exercise_id].push(o);
  }

  console.log(`Total MC/TF exercises: ${exs.length}\n`);

  let missingCount = 0;
  for (const ex of exs) {
    const exOpts = optMap[ex.id] || [];
    const missing = exOpts.length === 0;
    if (missing) missingCount++;

    console.log(`ID ${ex.id} [${ex.question_type}] – ${exOpts.length} options ${missing ? '❌ MISSING OPTIONS' : '✅'}`);
    console.log(`  Q: ${ex.question.substring(0, 100)}`);
    if (exOpts.length > 0) {
      exOpts.forEach(o => console.log(`    ${o.is_correct ? '✅' : '  '} ${o.option_label}: ${o.option_text}`));
    }
    console.log();
  }

  console.log(`\nTotal exercises MISSING options: ${missingCount}`);
}

run().catch(console.error);
