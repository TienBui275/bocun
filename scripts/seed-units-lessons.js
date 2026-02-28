const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedUnitsAndLessons() {
  console.log('🌱 Bắt đầu seed Units & Lessons cho Cun Bo Project...\n')

  // Lấy grade IDs
  const { data: grades, error: gradesError } = await supabase
    .from('grades')
    .select('id, slug, name')
  
  if (gradesError) {
    console.log('❌ Lỗi khi lấy grades:', gradesError.message)
    return
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, slug, name')
  
  if (subjectsError) {
    console.log('❌ Lỗi khi lấy subjects:', subjectsError.message)
    return
  }

  console.log(`✅ Tìm thấy ${grades.length} grades và ${subjects.length} subjects\n`)

  const gradePreK = grades.find(g => g.slug === 'pre-k')
  const gradeLop1 = grades.find(g => g.slug === 'lop-1')
  const subjectToan = subjects.find(s => s.slug === 'toan')
  const subjectKhoaHoc = subjects.find(s => s.slug === 'khoa-hoc')

  if (!gradePreK || !subjectToan) {
    console.log('❌ Không tìm thấy grade Pre-K hoặc môn Toán!')
    return
  }

  // ============================================
  // 1. Tạo Unit 1: Number (Pre-K + Toán)
  // ============================================
  console.log('📚 Tạo Unit 1: Number (Pre-K - Toán)...')
  
  const { data: unit1, error: unit1Error } = await supabase
    .from('units')
    .upsert({
      grade_id: gradePreK.id,
      subject_id: subjectToan.id,
      title: 'Unit 1: Number',
      slug: 'unit-1-number',
      unit_number: 1,
      description: 'Học về số từ 1-10 và cách đếm cơ bản',
      order_index: 1,
      lesson_count: 2,
      is_active: true
    }, {
      onConflict: 'grade_id,subject_id,slug'
    })
    .select()
    .single()

  if (unit1Error) {
    console.log('⚠️  Unit 1 đã tồn tại hoặc lỗi:', unit1Error.message)
    return
  }
  
  console.log(`✅ Đã tạo unit: ${unit1.title}`)

  // ============================================
  // 1.1 Tạo Lesson 1.1: Counting
  // ============================================
  console.log('  📖 Tạo Lesson 1.1: Counting...')
  
  const { data: lesson1_1, error: lesson1_1Error } = await supabase
    .from('lessons')
    .upsert({
      unit_id: unit1.id,
      title: '1.1 Counting',
      slug: 'counting',
      lesson_number: '1.1',
      description: 'Học đếm từ 1 đến 5',
      order_index: 1,
      exercise_count: 3,
      is_active: true
    }, {
      onConflict: 'unit_id,slug'
    })
    .select()
    .single()

  if (lesson1_1Error) {
    console.log('  ⚠️  Lesson 1.1 đã tồn tại:', lesson1_1Error.message)
  } else {
    console.log(`  ✅ Đã tạo lesson: ${lesson1_1.title}`)

    // Tạo 3 exercises cho lesson 1.1
    const exercises1_1 = [
      {
        lesson_id: lesson1_1.id,
        question: '🍎 Đếm số quả táo. Có bao nhiêu quả?',
        question_type: 'multiple_choice',
        explanation: 'Hãy đếm từng quả một: 1, 2, 3. Có 3 quả táo!',
        hint: 'Dùng ngón tay để đếm nhé!',
        order_index: 1,
        difficulty: 1,
        points: 10,
      },
      {
        lesson_id: lesson1_1.id,
        question: '⭐ Đếm số ngôi sao. Có bao nhiêu ngôi sao?',
        question_type: 'multiple_choice',
        explanation: 'Đếm từng ngôi sao: 1, 2, 3, 4. Có 4 ngôi sao!',
        hint: 'Đếm chậm rãi từ 1 đến 4',
        order_index: 2,
        difficulty: 1,
        points: 10,
      },
      {
        lesson_id: lesson1_1.id,
        question: '🐟 Đếm số con cá. Có bao nhiêu con?',
        question_type: 'multiple_choice',
        explanation: 'Đếm: 1, 2, 3, 4, 5. Có 5 con cá!',
        hint: 'Hãy đếm từ trái qua phải',
        order_index: 3,
        difficulty: 1,
        points: 10,
      },
    ]

    for (const ex of exercises1_1) {
      const { data: exercise, error: exError } = await supabase
        .from('exercises')
        .insert(ex)
        .select()
        .single()

      if (exError) {
        console.log(`    ⚠️  Bài tập đã tồn tại: ${ex.question}`)
        continue
      }

      console.log(`    ✓ Tạo bài tập: ${exercise.question}`)

      // Tạo options cho từng câu
      let options = []
      
      if (ex.order_index === 1) {
        options = [
          { exercise_id: exercise.id, option_label: 'A', option_text: '2', is_correct: false, order_index: 1 },
          { exercise_id: exercise.id, option_label: 'B', option_text: '3', is_correct: true, order_index: 2 },
          { exercise_id: exercise.id, option_label: 'C', option_text: '4', is_correct: false, order_index: 3 },
        ]
      } else if (ex.order_index === 2) {
        options = [
          { exercise_id: exercise.id, option_label: 'A', option_text: '3', is_correct: false, order_index: 1 },
          { exercise_id: exercise.id, option_label: 'B', option_text: '4', is_correct: true, order_index: 2 },
          { exercise_id: exercise.id, option_label: 'C', option_text: '5', is_correct: false, order_index: 3 },
        ]
      } else if (ex.order_index === 3) {
        options = [
          { exercise_id: exercise.id, option_label: 'A', option_text: '4', is_correct: false, order_index: 1 },
          { exercise_id: exercise.id, option_label: 'B', option_text: '5', is_correct: true, order_index: 2 },
          { exercise_id: exercise.id, option_label: 'C', option_text: '6', is_correct: false, order_index: 3 },
        ]
      }

      if (options.length > 0) {
        await supabase.from('exercise_options').insert(options)
        console.log(`    ✓ Đã tạo ${options.length} đáp án`)
      }
    }
  }

  // ============================================
  // 1.2 Tạo Lesson 1.2: Negative Numbers
  // ============================================
  console.log('  📖 Tạo Lesson 1.2: Negative Numbers...')
  
  const { data: lesson1_2, error: lesson1_2Error } = await supabase
    .from('lessons')
    .upsert({
      unit_id: unit1.id,
      title: '1.2 Negative Numbers',
      slug: 'negative-numbers',
      lesson_number: '1.2',
      description: 'Làm quen với số âm',
      order_index: 2,
      exercise_count: 2,
      is_active: true
    }, {
      onConflict: 'unit_id,slug'
    })
    .select()
    .single()

  if (lesson1_2Error) {
    console.log('  ⚠️  Lesson 1.2 đã tồn tại:', lesson1_2Error.message)
  } else {
    console.log(`  ✅ Đã tạo lesson: ${lesson1_2.title}`)

    // Tạo 2 exercises cho lesson 1.2
    const exercises1_2 = [
      {
        lesson_id: lesson1_2.id,
        question: '❄️ Nhiệt độ là -5°C. Đây là số gì?',
        question_type: 'multiple_choice',
        explanation: 'Số -5 là số âm, nhỏ hơn 0. Thường thấy ở nhiệt độ lạnh.',
        hint: 'Dấu trừ (-) trước số nghĩa là số âm',
        order_index: 1,
        difficulty: 2,
        points: 15,
      },
      {
        lesson_id: lesson1_2.id,
        question: 'Số nào lớn hơn: -3 hay 2?',
        question_type: 'multiple_choice',
        explanation: 'Số 2 lớn hơn -3. Số dương luôn lớn hơn số âm.',
        hint: 'Hãy nghĩ về nhiệt độ: 2°C ấm hơn -3°C',
        order_index: 2,
        difficulty: 2,
        points: 15,
      },
    ]

    for (const ex of exercises1_2) {
      const { data: exercise, error: exError } = await supabase
        .from('exercises')
        .insert(ex)
        .select()
        .single()

      if (exError) {
        console.log(`    ⚠️  Bài tập đã tồn tại: ${ex.question}`)
        continue
      }

      console.log(`    ✓ Tạo bài tập: ${exercise.question}`)

      let options = []
      
      if (ex.order_index === 1) {
        options = [
          { exercise_id: exercise.id, option_label: 'A', option_text: 'Số dương', is_correct: false, order_index: 1 },
          { exercise_id: exercise.id, option_label: 'B', option_text: 'Số âm', is_correct: true, order_index: 2 },
          { exercise_id: exercise.id, option_label: 'C', option_text: 'Số không', is_correct: false, order_index: 3 },
        ]
      } else if (ex.order_index === 2) {
        options = [
          { exercise_id: exercise.id, option_label: 'A', option_text: '-3', is_correct: false, order_index: 1 },
          { exercise_id: exercise.id, option_label: 'B', option_text: '2', is_correct: true, order_index: 2 },
          { exercise_id: exercise.id, option_label: 'C', option_text: 'Bằng nhau', is_correct: false, order_index: 3 },
        ]
      }

      if (options.length > 0) {
        await supabase.from('exercise_options').insert(options)
        console.log(`    ✓ Đã tạo ${options.length} đáp án`)
      }
    }
  }

  console.log('')

  // ============================================
  // 2. Tạo Unit 2: Addition (Lớp 1 + Toán)
  // ============================================
  if (gradeLop1) {
    console.log('📚 Tạo Unit 2: Addition (Lớp 1 - Toán)...')
    
    const { data: unit2, error: unit2Error } = await supabase
      .from('units')
      .upsert({
        grade_id: gradeLop1.id,
        subject_id: subjectToan.id,
        title: 'Unit 2: Addition',
        slug: 'unit-2-addition',
        unit_number: 2,
        description: 'Học phép cộng cơ bản từ 1-10',
        order_index: 2,
        lesson_count: 1,
        is_active: true
      }, {
        onConflict: 'grade_id,subject_id,slug'
      })
      .select()
      .single()

    if (unit2Error) {
      console.log('⚠️  Unit 2 đã tồn tại:', unit2Error.message)
    } else {
      console.log(`✅ Đã tạo unit: ${unit2.title}`)

      // ============================================
      // 2.1 Tạo Lesson 2.1: Basic Addition
      // ============================================
      console.log('  📖 Tạo Lesson 2.1: Basic Addition...')
      
      const { data: lesson2_1, error: lesson2_1Error } = await supabase
        .from('lessons')
        .upsert({
          unit_id: unit2.id,
          title: '2.1 Basic Addition',
          slug: 'basic-addition',
          lesson_number: '2.1',
          description: 'Phép cộng cơ bản trong phạm vi 10',
          order_index: 1,
          exercise_count: 2,
          is_active: true
        }, {
          onConflict: 'unit_id,slug'
        })
        .select()
        .single()

      if (lesson2_1Error) {
        console.log('  ⚠️  Lesson 2.1 đã tồn tại:', lesson2_1Error.message)
      } else {
        console.log(`  ✅ Đã tạo lesson: ${lesson2_1.title}`)

        const exercises2_1 = [
          {
            lesson_id: lesson2_1.id,
            question: '1 + 2 = ?',
            question_type: 'multiple_choice',
            explanation: 'Đếm: 1, thêm 2 nữa là: 2, 3. Kết quả là 3!',
            hint: 'Dùng ngón tay để cộng',
            order_index: 1,
            difficulty: 1,
            points: 10,
          },
          {
            lesson_id: lesson2_1.id,
            question: '3 + 4 = ?',
            question_type: 'multiple_choice',
            explanation: 'Bắt đầu từ 3, đếm thêm 4: 4, 5, 6, 7. Kết quả là 7!',
            hint: 'Đếm từ số 3',
            order_index: 2,
            difficulty: 1,
            points: 10,
          },
        ]

        for (const ex of exercises2_1) {
          const { data: exercise, error: exError } = await supabase
            .from('exercises')
            .insert(ex)
            .select()
            .single()

          if (exError) {
            console.log(`    ⚠️  Bài tập đã tồn tại: ${ex.question}`)
            continue
          }

          console.log(`    ✓ Tạo bài tập: ${exercise.question}`)

          let options = []
          
          if (ex.order_index === 1) {
            options = [
              { exercise_id: exercise.id, option_label: 'A', option_text: '2', is_correct: false, order_index: 1 },
              { exercise_id: exercise.id, option_label: 'B', option_text: '3', is_correct: true, order_index: 2 },
              { exercise_id: exercise.id, option_label: 'C', option_text: '4', is_correct: false, order_index: 3 },
            ]
          } else if (ex.order_index === 2) {
            options = [
              { exercise_id: exercise.id, option_label: 'A', option_text: '6', is_correct: false, order_index: 1 },
              { exercise_id: exercise.id, option_label: 'B', option_text: '7', is_correct: true, order_index: 2 },
              { exercise_id: exercise.id, option_label: 'C', option_text: '8', is_correct: false, order_index: 3 },
            ]
          }

          if (options.length > 0) {
            await supabase.from('exercise_options').insert(options)
            console.log(`    ✓ Đã tạo ${options.length} đáp án`)
          }
        }
      }
    }
  }

  console.log('')
  console.log('✅ Hoàn tất seed Units & Lessons!')
  console.log('')
  console.log('📊 Tổng kết:')
  console.log('   - 2 Units')
  console.log('   - 3 Lessons')
  console.log('   - 7 Exercises')
  console.log('')
}

// Run the seed function
seedUnitsAndLessons()
  .then(() => {
    console.log('👍 Script hoàn tất!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error.message)
    process.exit(1)
  })
