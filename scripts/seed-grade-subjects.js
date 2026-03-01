const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedGradeSubjects() {
  console.log('🌱 Starting seed grade_subjects...\n')

  // Get all grades and subjects
  const { data: grades } = await supabase
    .from('grades')
    .select('id, slug, name')
  
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, slug, name')

  console.log(`✅ Found ${grades?.length} grades and ${subjects?.length} subjects\n`)

  // Create grade_subjects for each combo (all grades have 3 subjects)
  const gradeSubjectsData = []
  
  for (const grade of grades || []) {
    for (const subject of subjects || []) {
      // Get actual statistics from units
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('grade_id', grade.id)
        .eq('subject_id', subject.id)
        .eq('is_active', true)

      const unitCount = units?.length || 0

      if (unitCount === 0) {
        console.log(`  ⚠️  Skipping: ${grade.name} - ${subject.name} (no units yet)`)
        continue
      }

      // Get lesson count
      const unitIds = units?.map(u => u.id) || []
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('unit_id', unitIds)
        .eq('is_active', true)

      const lessonCount = lessons?.length || 0

      // Get exercise count
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
      console.error('❌ Error inserting grade_subjects:', error.message)
    } else {
      console.log(`\n✅ Created ${gradeSubjectsData.length} grade_subjects!`)
    }
  } else {
    console.log('\n⚠️  No data to seed. Please import lessons/exercises first (e.g. node scripts/import-lesson-csv.js --file <csv>).')
  }

  console.log('')
}

seedGradeSubjects()
  .then(() => {
    console.log('👍 Script complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
