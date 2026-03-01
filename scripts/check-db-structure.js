// Script kiểm tra cấu trúc database thực tế hiện tại
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oehylgyeplocedqcuyza.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laHlsZ3llcGxvY2VkcWN1eXphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI2NjI5NywiZXhwIjoyMDg3ODQyMjk3fQ.WwFnZf9YIJEw-_sNcVpIy6yyy9jIsbTvVdoSCCWhdAM'
);

async function listTables() {
  console.log('=== KIỂM TRA CẤU TRÚC DATABASE THỰC TẾ ===\n');

  // Kiểm tra từng table xem có tồn tại không
  const tablesToCheck = [
    'users', 'grades', 'subjects', 'grade_subjects',
    'topics',              // bảng cũ
    'units', 'lessons',
    'exercises', 'exercise_options',
    'student_progress',
    'topic_completions',   // bảng cũ
    'lesson_completions',
    'unit_completions',
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.log(`  ❌ ${table.padEnd(22)} - KHÔNG TỒN TẠI`);
      } else {
        console.log(`  ⚠️  ${table.padEnd(22)} - LỖI: ${error.message}`);
      }
    } else {
      const count = data.length;
      // Get column names by looking at first row
      const columns = data.length > 0 ? Object.keys(data[0]).join(', ') : '(no rows - unknown cols)';
      console.log(`  ✅ ${table.padEnd(22)} - TỒN TẠI`);
      if (data.length > 0) {
        console.log(`     Columns: ${columns}`);
      }
    }
  }

  // Kiểm tra cụ thể cột của exercises
  console.log('\n=== CỘT CỦA BẢNG exercises ===');
  const { data: exSample } = await supabase.from('exercises').select('*').limit(1);
  if (exSample && exSample.length > 0) {
    Object.entries(exSample[0]).forEach(([col, val]) => {
      console.log(`  ${col}: ${val === null ? 'NULL' : typeof val}`);
    });
  }

  // Kiểm tra cụ thể cột của grade_subjects
  console.log('\n=== CỘT CỦA BẢNG grade_subjects ===');
  const { data: gsSample } = await supabase.from('grade_subjects').select('*').limit(1);
  if (gsSample && gsSample.length > 0) {
    Object.entries(gsSample[0]).forEach(([col, val]) => {
      console.log(`  ${col}: ${val === null ? 'NULL' : typeof val}`);
    });
  }

  // Kiểm tra student_progress
  console.log('\n=== CỘT CỦA BẢNG student_progress ===');
  const { data: spSample } = await supabase.from('student_progress').select('*').limit(1);
  if (spSample !== null) {
    if (spSample.length > 0) {
      Object.entries(spSample[0]).forEach(([col, val]) => {
        console.log(`  ${col}: ${val === null ? 'NULL' : typeof val}`);
      });
    } else {
      console.log('  (bảng rỗng - cần check columns cách khác)');
    }
  }

  // Count records in key tables
  console.log('\n=== SỐ LƯỢNG DỮ LIỆU ===');
  for (const table of ['grades', 'subjects', 'grade_subjects', 'units', 'lessons', 'exercises']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`  ${table.padEnd(20)}: ${count} records`);
  }
}

listTables().catch(console.error);
