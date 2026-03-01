// Script to check the current actual database structure
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oehylgyeplocedqcuyza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM'
);

async function listTables() {
  console.log('=== CHECK ACTUAL DATABASE STRUCTURE ===\n');

  // Check each table to see if it exists
  const tablesToCheck = [
    'users', 'grades', 'subjects', 'grade_subjects',
    'topics',              // old table
    'units', 'lessons',
    'exercises', 'exercise_options',
    'student_progress',
    'topic_completions',   // old table
    'lesson_completions',
    'unit_completions',
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`  ❌ ${table.padEnd(22)} - DOES NOT EXIST`);
      } else {
        console.log(`  ⚠️  ${table.padEnd(22)} - ERROR: ${error.message}`);
      }
    } else {
      const count = data.length;
      // Get column names by looking at first row
      const columns = data.length > 0 ? Object.keys(data[0]).join(', ') : '(no rows - unknown cols)';
      console.log(`  ✅ ${table.padEnd(22)} - EXISTS`);
      if (data.length > 0) {
        console.log(`     Columns: ${columns}`);
      }
    }
  }

  // Check specific columns of exercises
  console.log('\n=== COLUMNS OF exercises TABLE ===');
  const { data: exSample } = await supabase.from('exercises').select('*').limit(1);
  if (exSample && exSample.length > 0) {
    Object.entries(exSample[0]).forEach(([col, val]) => {
      console.log(`  ${col}: ${val === null ? 'NULL' : typeof val}`);
    });
  }

  // Check specific columns of grade_subjects
  console.log('\n=== COLUMNS OF grade_subjects TABLE ===');
  const { data: gsSample } = await supabase.from('grade_subjects').select('*').limit(1);
  if (gsSample && gsSample.length > 0) {
    Object.entries(gsSample[0]).forEach(([col, val]) => {
      console.log(`  ${col}: ${val === null ? 'NULL' : typeof val}`);
    });
  }

  // Check student_progress
  console.log('\n=== COLUMNS OF student_progress TABLE ===');
  const { data: spSample } = await supabase.from('student_progress').select('*').limit(1);
  if (spSample !== null) {
    if (spSample.length > 0) {
      Object.entries(spSample[0]).forEach(([col, val]) => {
        console.log(`  ${col}: ${val === null ? 'NULL' : typeof val}`);
      });
    } else {
      console.log('  (empty table - check columns another way)');
    }
  }

  // Count records in key tables
  console.log('\n=== RECORD COUNTS ===');
  for (const table of ['grades', 'subjects', 'grade_subjects', 'units', 'lessons', 'exercises']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`  ${table.padEnd(20)}: ${count} records`);
  }
}

listTables().catch(console.error);
