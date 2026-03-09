import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/progress
 * Save one exercise answer via the atomic RPC submit_exercise_answer().
 *
 * Body: {
 *   exercise_id : number   – required
 *   lesson_id   : number   – required
 *   unit_id     : number   – required
 *   is_correct  : boolean  – required
 *   hint_used   : boolean  – optional, default false
 *   time_secs   : number   – optional, seconds spent on this question
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      exercise_id,
      lesson_id,
      unit_id,
      is_correct,
      hint_used = false,
      time_secs = 0,
    } = body

    if (!exercise_id || !lesson_id || !unit_id || is_correct === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: exercise_id, lesson_id, unit_id, is_correct' },
        { status: 400 }
      )
    }

    // Single atomic call – handles exercise_results + lesson_progress + daily_study_log
    const { error: rpcError } = await supabase.rpc('submit_exercise_answer', {
      p_user_id: user.id,
      p_exercise_id: exercise_id,
      p_lesson_id: lesson_id,
      p_unit_id: unit_id,
      p_is_correct: is_correct,
      p_hint_used: hint_used,
      p_time_secs: time_secs,
    })

    if (rpcError) {
      console.error('[progress POST] RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Failed to save progress', details: rpcError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: is_correct ? '🎉 Correct!' : '💡 Keep going!',
    })

  } catch (err) {
    console.error('[progress POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/progress
 *
 * ?lesson_id=123          → lesson-level stats from v_lesson_progress
 * ?lesson_id=123&detail=1 → same + per-exercise results (for "redo wrong" / "skip done")
 * ?weekly=1               → last-7-days study log for the current user
 */
export async function GET(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lesson_id')
    const weekly = searchParams.get('weekly')
    const detail = searchParams.get('detail')

    // ── Weekly study log ────────────────────────────────────────
    if (weekly) {
      const { data, error } = await supabase
        .from('v_weekly_study')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, weekly: data })
    }

    // ── Lesson-level stats ──────────────────────────────────────
    if (!lessonId) {
      return NextResponse.json(
        { error: 'Provide lesson_id or weekly=1' },
        { status: 400 }
      )
    }

    // Pre-aggregated stats (fast – 1 row)
    const { data: lessonProgress, error: lpError } = await supabase
      .from('v_lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (lpError) {
      return NextResponse.json({ error: lpError.message }, { status: 500 })
    }

    // Optionally return per-exercise detail (for "redo wrong" / "skip done")
    let exerciseResults = null
    if (detail) {
      const { data, error } = await supabase
        .from('exercise_results')
        .select('exercise_id, is_correct, hint_used, attempt_count, answered_at')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      exerciseResults = data
    }

    return NextResponse.json({
      success: true,
      lesson_progress: lessonProgress,    // null if student hasn't started this lesson
      exercise_results: exerciseResults,   // only present when ?detail=1
    })

  } catch (err) {
    console.error('[progress GET] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
