import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/exercises?lesson_id=123
 * GET /api/exercises?topic_id=123  (backward compatible)
 * Get list of exercises for a lesson or topic (with options)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lesson_id')
    const topicId = searchParams.get('topic_id') // backward compatible

    if (!lessonId && !topicId) {
      return NextResponse.json(
        { error: 'Missing required parameter: lesson_id or topic_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let parentData = null
    let parentKey = null
    let filterColumn = null
    let filterId = null

    // Prioritize lesson_id over topic_id
    if (lessonId) {
      // Get lesson info
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select(`
          *,
          units!inner (
            id, title, slug, unit_number,
            grades (id, name, slug, badge_label, color),
            subjects (id, name, slug, icon, color)
          )
        `)
        .eq('id', lessonId)
        .eq('is_active', true)
        .single()

      if (lessonError || !lesson) {
        return NextResponse.json(
          { error: 'Lesson not found', details: lessonError?.message },
          { status: 404 }
        )
      }

      parentData = lesson
      parentKey = 'lesson'
      filterColumn = 'lesson_id'
      filterId = lessonId

    } else if (topicId) {
      // Backward compatible: Get topic info
      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select(`
          *,
          grades (id, name, slug, badge_label, color),
          subjects (id, name, slug, icon, color)
        `)
        .eq('id', topicId)
        .eq('is_active', true)
        .single()

      if (topicError || !topic) {
        return NextResponse.json(
          { error: 'Topic not found', details: topicError?.message },
          { status: 404 }
        )
      }

      parentData = topic
      parentKey = 'topic'
      filterColumn = 'topic_id'
      filterId = topicId
    }

    // Get exercises with options
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select(`
        *,
        exercise_options (
          id,
          option_label,
          option_text,
          option_image_url,
          is_correct,
          order_index
        )
      `)
      .eq(filterColumn, filterId)
      .eq('is_active', true)
      .order('order_index')

    if (exercisesError) {
      return NextResponse.json(
        { error: 'Failed to fetch exercises', details: exercisesError.message },
        { status: 500 }
      )
    }

    // Sort options theo order_index
    const exercisesWithSortedOptions = exercises?.map(ex => ({
      ...ex,
      exercise_options: ex.exercise_options?.sort((a, b) => a.order_index - b.order_index) || []
    }))

    return NextResponse.json({
      success: true,
      [parentKey]: parentData,
      exercises: exercisesWithSortedOptions,
      count: exercisesWithSortedOptions?.length || 0
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
