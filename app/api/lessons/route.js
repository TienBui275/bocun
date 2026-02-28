import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/lessons?unit_id=123
 * Lấy danh sách lessons của một unit
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unit_id')

    if (!unitId) {
      return NextResponse.json(
        { error: 'Missing required parameter: unit_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Kiểm tra unit có tồn tại không
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select(`
        *,
        grades (id, name, slug, badge_label, color),
        subjects (id, name, slug, icon, color)
      `)
      .eq('id', unitId)
      .eq('is_active', true)
      .single()

    if (unitError || !unit) {
      return NextResponse.json(
        { error: 'Unit not found', details: unitError?.message },
        { status: 404 }
      )
    }

    // Lấy lessons trong unit
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .order('order_index')

    if (lessonsError) {
      return NextResponse.json(
        { error: 'Failed to fetch lessons', details: lessonsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      unit,
      lessons,
      count: lessons?.length || 0
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
