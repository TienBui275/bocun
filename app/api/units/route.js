import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/units?grade=pre-k&subject=toan
 * Get list of units by grade and subject
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

    // Get grade_id from slug
    const { data: grade, error: gradeError } = await supabase
      .from('grades')
      .select('id, name, slug, color, badge_label, level_order')
      .eq('slug', gradeSlug)
      .eq('is_active', true)
      .single()

    if (gradeError || !grade) {
      return NextResponse.json(
        { error: 'Grade not found', details: gradeError?.message },
        { status: 404 }
      )
    }

    // Get subject_id from slug
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

    // Get units
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .eq('grade_id', grade.id)
      .eq('subject_id', subject.id)
      .eq('is_active', true)
      .order('order_index')

    if (unitsError) {
      return NextResponse.json(
        { error: 'Failed to fetch units', details: unitsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      grade,
      subject,
      units,
      count: units?.length || 0
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
