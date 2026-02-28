const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function seedData() {
  console.log('🌱 Bắt đầu seed data cho Cun Bo Project...\n')

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
  // 1. Tạo Topic: "Đếm số 1-5" (Pre-K + Toán)
  // ============================================
  console.log('📚 Tạo topic: "Đếm số 1-5" (Pre-K - Toán)...')
  
  const { data: topic1, error: topic1Error } = await supabase
    .from('topics')
    .upsert({
      grade_id: gradePreK.id,
      subject_id: subjectToan.id,
      title: 'Đếm số 1-5',
      slug: 'dem-so-1-5',
      description: 'Học đếm từ 1 đến 5 với hình ảnh sinh động',
      order_index: 1,
      exercise_count: 3,
      is_active: true
    }, {
      onConflict: 'grade_id,subject_id,slug'
    })
    .select()
    .single()

  if (topic1Error) {
    console.log('⚠️  Topic "Đếm số 1-5" đã tồn tại hoặc lỗi:', topic1Error.message)
  } else {
    console.log(`✅ Đã tạo topic: ${topic1.title}`)

    // Tạo 3 exercises cho topic này
    const exercises1 = [
      {
        topic_id: topic1.id,
        question: '🍎 Đếm số quả táo. Có bao nhiêu quả?',
        question_type: 'multiple_choice',
        explanation: 'Hãy đếm từng quả một: 1, 2, 3. Có 3 quả táo!',
        hint: 'Dùng ngón tay để đếm nhé!',
        order_index: 1,
        difficulty: 1,
        points: 10,
      },
      {
        topic_id: topic1.id,
        question: '1 + 1 = ?',
        question_type: 'multiple_choice',
        explanation: '1 cái + 1 cái = 2 cái. Hãy đếm bằng ngón tay!',
        hint: 'Hãy thử đếm ngón tay!',
        order_index: 2,
        difficulty: 1,
        points: 10,
      },
      {
        topic_id: topic1.id,
        question: 'Số nào lớn hơn: 3 hay 5?',
        question_type: 'multiple_choice',
        explanation: '5 lớn hơn 3. Hãy đếm: 1, 2, 3, 4, 5!',
        hint: 'Đếm từ 1 đến 5 xem số nào đến sau!',
        order_index: 3,
        difficulty: 1,
        points: 10,
      },
    ]

    for (const ex of exercises1) {
      const { data: exercise, error: exError } = await supabase
        .from('exercises')
        .insert(ex)
        .select()
        .single()

      if (exError) {
        console.log(`  ⚠️  Bài tập đã tồn tại: ${ex.question}`)
        continue
      }

      console.log(`  ✓ Tạo bài tập: ${exercise.question}`)

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
          { exercise_id: exercise.id, option_label: 'A', option_text: '1', is_correct: false, order_index: 1 },
          { exercise_id: exercise.id, option_label: 'B', option_text: '2', is_correct: true, order_index: 2 },
          { exercise_id: exercise.id, option_label: 'C', option_text: '3', is_correct: false, order_index: 3 },
        ]
      } else if (ex.order_index === 3) {
        options = [
          { exercise_id: exercise.id, option_label: 'A', option_text: '3', is_correct: false, order_index: 1 },
          { exercise_id: exercise.id, option_label: 'B', option_text: '5', is_correct: true, order_index: 2 },
        ]
      }

      const { error: optError } = await supabase
        .from('exercise_options')
        .insert(options)

      if (optError) {
        console.log(`    ⚠️  Lỗi tạo options: ${optError.message}`)
      } else {
        console.log(`    ✓ Đã tạo ${options.length} đáp án`)
      }
    }
  }

  console.log('')

  // ============================================
  // 2. Tạo Topic: "Số 1-10" (Lớp 1 + Toán)
  // ============================================
  if (gradeLop1) {
    console.log('📚 Tạo topic: "Số 1 đến 10" (Lớp 1 - Toán)...')
    
    const { data: topic2, error: topic2Error } = await supabase
      .from('topics')
      .upsert({
        grade_id: gradeLop1.id,
        subject_id: subjectToan.id,
        title: 'Số 1 đến 10',
        slug: 'so-1-den-10',
        description: 'Học đếm và nhận biết các số từ 1 đến 10',
        order_index: 1,
        exercise_count: 5,
        is_active: true
      }, {
        onConflict: 'grade_id,subject_id,slug'
      })
      .select()
      .single()

    if (topic2Error) {
      console.log('⚠️  Topic "Số 1 đến 10" đã tồn tại hoặc lỗi:', topic2Error.message)
    } else {
      console.log(`✅ Đã tạo topic: ${topic2.title}`)

      const exercises2 = [
        {
          topic_id: topic2.id,
          question: '5 + 3 = ?',
          question_type: 'multiple_choice',
          explanation: 'Đếm: 5... 6, 7, 8. Kết quả là 8!',
          hint: 'Đếm thêm 3 số từ 5',
          order_index: 1,
          difficulty: 1,
          points: 10,
        },
        {
          topic_id: topic2.id,
          question: '10 - 2 = ?',
          question_type: 'multiple_choice',
          explanation: 'Lùi 2 bước từ 10: 9, 8. Kết quả là 8!',
          hint: 'Đếm ngược từ 10',
          order_index: 2,
          difficulty: 1,
          points: 10,
        },
      ]

      for (const ex of exercises2) {
        const { data: exercise, error: exError } = await supabase
          .from('exercises')
          .insert(ex)
          .select()
          .single()

        if (exError) {
          console.log(`  ⚠️  Bài tập đã tồn tại: ${ex.question}`)
          continue
        }

        console.log(`  ✓ Tạo bài tập: ${exercise.question}`)

        let options = []
        
        if (ex.order_index === 1) {
          options = [
            { exercise_id: exercise.id, option_label: 'A', option_text: '7', is_correct: false, order_index: 1 },
            { exercise_id: exercise.id, option_label: 'B', option_text: '8', is_correct: true, order_index: 2 },
            { exercise_id: exercise.id, option_label: 'C', option_text: '9', is_correct: false, order_index: 3 },
          ]
        } else if (ex.order_index === 2) {
          options = [
            { exercise_id: exercise.id, option_label: 'A', option_text: '7', is_correct: false, order_index: 1 },
            { exercise_id: exercise.id, option_label: 'B', option_text: '8', is_correct: true, order_index: 2 },
            { exercise_id: exercise.id, option_label: 'C', option_text: '9', is_correct: false, order_index: 3 },
          ]
        }

        await supabase.from('exercise_options').insert(options)
        console.log(`    ✓ Đã tạo ${options.length} đáp án`)
      }
    }
  }

  console.log('')

  // ============================================
  // 3. Tạo Topic Khoa Học (nếu có)
  // ============================================
  if (subjectKhoaHoc && gradePreK) {
    console.log('📚 Tạo topic: "Màu sắc" (Pre-K - Khoa Học)...')
    
    const { data: topic3, error: topic3Error } = await supabase
      .from('topics')
      .upsert({
        grade_id: gradePreK.id,
        subject_id: subjectKhoaHoc.id,
        title: 'Nhận biết màu sắc',
        slug: 'nhan-biet-mau-sac',
        description: 'Học nhận biết các màu cơ bản: đỏ, xanh, vàng',
        order_index: 1,
        exercise_count: 2,
        is_active: true
      }, {
        onConflict: 'grade_id,subject_id,slug'
      })
      .select()
      .single()

    if (topic3Error) {
      console.log('⚠️  Topic "Nhận biết màu sắc" đã tồn tại hoặc lỗi:', topic3Error.message)
    } else {
      console.log(`✅ Đã tạo topic: ${topic3.title}`)
    }
  }

  console.log('\n✅ Hoàn tất seed data!')
  console.log('\n📊 Thống kê:')
  console.log(`   - Grades: ${grades.length}`)
  console.log(`   - Subjects: ${subjects.length}`)
  console.log(`   - Topics: Đã tạo mẫu`)
  console.log(`   - Exercises: Đã tạo mẫu`)
}

// Chạy seed script
seedData().catch(err => {
  console.error('❌ Lỗi:', err.message)
  process.exit(1)
})
