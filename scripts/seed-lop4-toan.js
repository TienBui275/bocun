const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GRADE_ID = 6  // lop-4
const SUBJECT_ID = 1 // toan

const UNITS_DATA = [
  {
    title: 'Unit 1: Numbers and the number system',
    slug: 'unit-1-numbers-and-the-number-system',
    unit_number: 1,
    description: 'Hệ thống số, đếm, số âm và giá trị vị trí',
    order_index: 1,
    lessons: [
      { lesson_number: '1.1', title: '1.1 Counting and sequences',            slug: 'counting-and-sequences',         order_index: 1 },
      { lesson_number: '1.2', title: '1.2 More on negative numbers',          slug: 'more-on-negative-numbers',       order_index: 2 },
      { lesson_number: '1.3', title: '1.3 Understanding place value',         slug: 'understanding-place-value',      order_index: 3 },
    ],
  },
  {
    title: 'Unit 2: Time and timetables',
    slug: 'unit-2-time-and-timetables',
    unit_number: 2,
    description: 'Đọc giờ, thời gian và lịch trình',
    order_index: 2,
    lessons: [
      { lesson_number: '2.1', title: '2.1 Time',                              slug: 'time',                           order_index: 1 },
      { lesson_number: '2.2', title: '2.2 Timetables and time intervals',     slug: 'timetables-and-time-intervals',  order_index: 2 },
    ],
  },
  {
    title: 'Unit 3: Addition and subtraction of whole numbers',
    slug: 'unit-3-addition-and-subtraction-of-whole-numbers',
    unit_number: 3,
    description: 'Phép cộng và trừ số nguyên nâng cao',
    order_index: 3,
    lessons: [
      { lesson_number: '3.1', title: '3.1 Using a symbol to represent a missing number or operation', slug: 'missing-number-or-operation',      order_index: 1 },
      { lesson_number: '3.2', title: '3.2 Addition and subtraction of whole numbers',                 slug: 'addition-and-subtraction',          order_index: 2 },
      { lesson_number: '3.3', title: '3.3 Generalising with odd and even numbers',                    slug: 'odd-and-even-numbers',              order_index: 3 },
    ],
  },
  {
    title: 'Unit 4: Probability',
    slug: 'unit-4-probability',
    unit_number: 4,
    description: 'Xác suất và khả năng xảy ra',
    order_index: 4,
    lessons: [
      { lesson_number: '4.1', title: '4.1 Likelihood',                        slug: 'likelihood',                     order_index: 1 },
    ],
  },
  {
    title: 'Unit 5: Multiplication, multiples and factors',
    slug: 'unit-5-multiplication-multiples-and-factors',
    unit_number: 5,
    description: 'Phép nhân, bội số và ước số',
    order_index: 5,
    lessons: [
      { lesson_number: '5.1', title: '5.1 Tables, multiples and factors',     slug: 'tables-multiples-and-factors',   order_index: 1 },
      { lesson_number: '5.2', title: '5.2 Multiplication',                    slug: 'multiplication',                 order_index: 2 },
    ],
  },
]

async function seedLop4Toan() {
  console.log('🌱 Seed dữ liệu: Lớp 4 - Toán\n')

  let totalUnits = 0
  let totalLessons = 0

  for (const unitData of UNITS_DATA) {
    const { lessons, ...unitFields } = unitData

    // Upsert unit
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .upsert(
        {
          grade_id: GRADE_ID,
          subject_id: SUBJECT_ID,
          ...unitFields,
          lesson_count: lessons.length,
          is_active: true,
        },
        { onConflict: 'grade_id,subject_id,slug' }
      )
      .select()
      .single()

    if (unitError) {
      console.error(`  ❌ Lỗi unit "${unitFields.title}":`, unitError.message)
      continue
    }

    console.log(`📚 ${unit.title}`)
    totalUnits++

    // Upsert lessons trong unit
    for (const lessonData of lessons) {
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .upsert(
          {
            unit_id: unit.id,
            ...lessonData,
            exercise_count: 0,
            is_active: true,
          },
          { onConflict: 'unit_id,slug' }
        )
        .select()
        .single()

      if (lessonError) {
        console.error(`    ❌ Lỗi lesson "${lessonData.title}":`, lessonError.message)
        continue
      }

      console.log(`   ✅ ${lesson.lesson_number} ${lesson.title.replace(lesson.lesson_number + ' ', '')}`)
      totalLessons++
    }

    console.log()
  }

  // Cập nhật grade_subjects thống kê
  const { error: gsError } = await supabase
    .from('grade_subjects')
    .upsert(
      {
        grade_id: GRADE_ID,
        subject_id: SUBJECT_ID,
        unit_count: totalUnits,
        lesson_count: totalLessons,
        exercise_count: 0,
        is_active: true,
      },
      { onConflict: 'grade_id,subject_id' }
    )

  if (gsError) {
    console.error('❌ Lỗi cập nhật grade_subjects:', gsError.message)
  } else {
    console.log('📊 Đã cập nhật grade_subjects thống kê')
  }

  console.log('─'.repeat(40))
  console.log(`✅ Hoàn tất! ${totalUnits} units, ${totalLessons} lessons`)
}

seedLop4Toan()
  .then(() => process.exit(0))
  .catch((err) => { console.error('❌', err.message); process.exit(1) })
