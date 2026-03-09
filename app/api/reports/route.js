import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/reports
 * Submit a report for an exercise.
 *
 * Body: {
 *   exercise_id: number,
 *   reason: 'wrong_answer' | 'typo' | 'unclear' | 'broken_image' | 'other',
 *   content: string
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    // User is optional – anonymous reports are allowed
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { exercise_id, reason = 'other', content } = body

    if (!exercise_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: exercise_id, content' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('exercise_reports')
      .insert({
        exercise_id,
        user_id: user?.id ?? null,
        reason,
        content: content.trim(),
      })

    if (error) {
      console.error('Error saving report:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Unexpected error in /api/reports:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
