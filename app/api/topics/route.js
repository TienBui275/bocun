import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/topics?grade=pre-k&subject=toan
 * Lấy danh sách topics theo grade và subject
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const gradeSlug = searchParams.get('grade')
    const subjectSlug = searchParams.get('subject')

    if (!gradeSlug || !subjectSlug) {
      return NextResponse.json(
        { error: 'Missing required parameters: grade and subject' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Lấy grade_id từ slug
    const { data: grade, error: gradeError } = await supabase
      .from('grades')
      .select('id, name, slug, color, badge_label')
      .eq('slug', gradeSlug)
      .eq('is_active', true)
      .single()

    if (gradeError || !grade) {
      return NextResponse.json(
        { error: 'Grade not found', details: gradeError?.message },
        { status: 404 }
      )
    }

    // Lấy subject_id từ slug
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, slug, icon, color')
      .eq('slug', subjectSlug)
      .eq('is_active', true)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Subject not found', details: subjectError?.message },
        { status: 404 }
      )
    }

    // Lấy topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('grade_id', grade.id)
      .eq('subject_id', subject.id)
      .eq('is_active', true)
      .order('order_index')

    if (topicsError) {
      return NextResponse.json(
        { error: 'Failed to fetch topics', details: topicsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      grade,
      subject,
      topics,
      count: topics?.length || 0
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
