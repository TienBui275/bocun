import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/grades-with-subjects
 * Get list of grades with subjects and statistics
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get all grades
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('id, name, slug, badge_label, color, description, level_order')
      .eq('is_active', true)
      .order('level_order')

    if (gradesError) {
      return NextResponse.json(
        { error: 'Failed to fetch grades', details: gradesError.message },
        { status: 500 }
      )
    }

    // Get all subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, slug, icon')
      .eq('is_active', true)

    // Get grade_subjects (statistics)
    const { data: gradeSubjects } = await supabase
      .from('grade_subjects')
      .select('grade_id, subject_id, unit_count, lesson_count, exercise_count')
      .eq('is_active', true)

    // Combine data
    const gradesWithSubjects = grades?.map((grade) => {
      const gradeSubjectsList = subjects
        ?.map((subject) => {
          const stats = gradeSubjects?.find(
            (gs) => gs.grade_id === grade.id && gs.subject_id === subject.id
          )
          
          if (!stats) return null

          return {
            ...subject,
            unit_count: stats.unit_count || 0,
            lesson_count: stats.lesson_count || 0,
            exercise_count: stats.exercise_count || 0,
          }
        })
        .filter(Boolean)

      return {
        ...grade,
        subjects: gradeSubjectsList,
      }
    }) || []

    return NextResponse.json({
      success: true,
      grades: gradesWithSubjects,
      count: gradesWithSubjects.length
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
