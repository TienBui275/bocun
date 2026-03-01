const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedGradeSubjects() {
  console.log('🌱 Bắt đầu seed grade_subjects...\n')

  // Lấy tất cả grades và subjects
  const { data: grades } = await supabase
    .from('grades')
    .select('id, slug, name')
  
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, slug, name')

  console.log(`✅ Tìm thấy ${grades?.length} grades và ${subjects?.length} subjects\n`)

  // Tạo grade_subjects cho mỗi combo (tất cả grades có 3 subjects)
  const gradeSubjectsData = []
  
  for (const grade of grades || []) {
    for (const subject of subjects || []) {
      // Lấy thống kê thực tế từ units
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('grade_id', grade.id)
        .eq('subject_id', subject.id)
        .eq('is_active', true)

      const unitCount = units?.length || 0

      if (unitCount === 0) {
        console.log(`  ⚠️  Bỏ qua: ${grade.name} - ${subject.name} (chưa có units)`)
        continue
      }

      // Lấy lesson count
      const unitIds = units?.map(u => u.id) || []
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('unit_id', unitIds)
        .eq('is_active', true)

      const lessonCount = lessons?.length || 0

      // Lấy exercise count
      const lessonIds = lessons?.map(l => l.id) || []
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id')
        .in('lesson_id', lessonIds)
        .eq('is_active', true)

      const exerciseCount = exercises?.length || 0

      gradeSubjectsData.push({
        grade_id: grade.id,
        subject_id: subject.id,
        unit_count: unitCount,
        lesson_count: lessonCount,
        exercise_count: exerciseCount,
        is_active: true
      })

      console.log(`  ✅ ${grade.name} - ${subject.name}: ${unitCount} units, ${lessonCount} lessons, ${exerciseCount} exercises`)
    }
  }

  if (gradeSubjectsData.length > 0) {
    const { error } = await supabase
      .from('grade_subjects')
      .upsert(gradeSubjectsData, {
        onConflict: 'grade_id,subject_id'
      })

    if (error) {
      console.error('❌ Lỗi khi insert grade_subjects:', error.message)
    } else {
      console.log(`\n✅ Đã tạo ${gradeSubjectsData.length} grade_subjects!`)
    }
  } else {
    console.log('\n⚠️  Không có dữ liệu để seed. Hãy import dữ liệu lessons/exercises trước (ví dụ: node scripts/import-lesson-csv.js --file <csv>).')
  }

  console.log('')
}

seedGradeSubjects()
  .then(() => {
    console.log('👍 Script hoàn tất!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error.message)
    process.exit(1)
  })
