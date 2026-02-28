import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/progress
 * Lưu kết quả làm bài của học sinh
 * 
 * Body: {
 *   exercise_id: number,
 *   lesson_id?: number,      // New
 *   unit_id?: number,        // New
 *   topic_id?: number,       // Backward compatible
 *   is_correct: boolean,
 *   answer_given: string,
 *   time_spent_seconds?: number
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Kiểm tra user đã đăng nhập chưa
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      exercise_id, 
      lesson_id,   // New: ID của lesson
      unit_id,     // New: ID của unit
      topic_id,    // Backward compatible
      is_correct, 
      answer_given, 
      time_spent_seconds 
    } = body

    // Validate required fields
    if (!exercise_id || is_correct === undefined || !answer_given) {
      return NextResponse.json(
        { error: 'Missing required fields: exercise_id, is_correct, answer_given' },
        { status: 400 }
      )
    }

    // At least one of lesson_id or topic_id should be provided
    if (!lesson_id && !topic_id) {
      return NextResponse.json(
        { error: 'At least one of lesson_id or topic_id must be provided' },
        { status: 400 }
      )
    }

    // Lưu progress
    const progressData = {
      user_id: user.id,
      exercise_id,
      is_correct,
      answer_given,
      time_spent_seconds: time_spent_seconds || null,
      attempt_count: 1
    }

    // Add lesson_id and unit_id if provided
    if (lesson_id) progressData.lesson_id = lesson_id
    if (unit_id) progressData.unit_id = unit_id
    if (topic_id) progressData.topic_id = topic_id // Backward compatible

    const { data: progress, error: progressError } = await supabase
      .from('student_progress')
      .insert(progressData)
      .select()
      .single()

    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to save progress', details: progressError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      progress,
      message: is_correct ? '🎉 Chính xác!' : '💡 Hãy thử lại!'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/progress?lesson_id=123
 * GET /api/progress?unit_id=123
 * GET /api/progress?topic_id=123  (backward compatible)
 * Lấy tiến độ của user cho một lesson, unit hoặc topic
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lesson_id')
    const unitId = searchParams.get('unit_id')
    const topicId = searchParams.get('topic_id') // Backward compatible

    const supabase = await createClient()

    // Kiểm tra user đã đăng nhập chưa
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      )
    }

    if (!lessonId && !unitId && !topicId) {
      return NextResponse.json(
        { error: 'Missing required parameter: lesson_id, unit_id, or topic_id' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('student_progress')
      .select('*')
      .eq('user_id', user.id)

    // Apply filter based on what's provided (prioritize lesson_id > unit_id > topic_id)
    if (lessonId) {
      query = query.eq('lesson_id', lessonId)
    } else if (unitId) {
      query = query.eq('unit_id', unitId)
    } else if (topicId) {
      query = query.eq('topic_id', topicId)
    }

    const { data: progressList, error: progressError } = await query.order('completed_at', { ascending: false })

    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to fetch progress', details: progressError.message },
        { status: 500 }
      )
    }

    // Tính thống kê
    const totalAttempts = progressList?.length || 0
    const correctCount = progressList?.filter(p => p.is_correct).length || 0
    const incorrectCount = totalAttempts - correctCount
    const accuracy = totalAttempts > 0 ? ((correctCount / totalAttempts) * 100).toFixed(2) : 0

    return NextResponse.json({
      success: true,
      progress: progressList,
      stats: {
        total_attempts: totalAttempts,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        accuracy: `${accuracy}%`
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
