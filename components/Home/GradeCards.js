import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const GradeCard = ({ grade }) => {
    return (
        <div
            className="cb-grade-card"
            style={{ "--card-color": grade.color }}
        >
            <div className="cb-card-header">
                <div className="cb-grade-badge">{grade.badge_label}</div>
                <h3 className="cb-grade-name">{grade.name}</h3>
            </div>

            <p className="cb-grade-desc">{grade.description || "Content coming soon..."}</p>

            <div className="cb-divider" />

            <div className="cb-subjects-list">
                {grade.subjects?.map((subject) => (
                    <div key={subject.id} className="cb-subject-row">
                        <span className="cb-subject-name">
                            <span className="subject-icon">{subject.icon}</span>
                            {subject.name}
                        </span>
                        <div className="cb-subject-stats">
                            <Link
                                href={`/grade/${grade.slug}?subject=${subject.slug}`}
                                className="cb-stat-link"
                            >
                                {subject.unit_count || 0} units &gt;
                            </Link>
                            <span className="cb-stat-divider">|</span>
                            <Link
                                href={`/grade/${grade.slug}?subject=${subject.slug}`}
                                className="cb-stat-link"
                            >
                                {subject.exercise_count || 0} exercises &gt;
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GradeCards = async () => {
    const supabase = await createClient();

    // Get all grades
    const { data: grades, error: gradesError } = await supabase
        .from("grades")
        .select("id, name, slug, badge_label, color, description, level_order")
        .eq("is_active", true)
        .order("level_order");

    if (gradesError) {
        console.error("Error fetching grades:", gradesError);
        return (
            <section className="cb-grades-section" id="grades">
                <div className="container">
                    <p className="text-center text-danger">Unable to load grade data.</p>
                </div>
            </section>
        );
    }

    // Get subjects and grade_subjects in parallel
    const [{ data: subjects }, { data: gradeSubjects }] = await Promise.all([
        supabase
            .from("subjects")
            .select("id, name, slug, icon")
            .eq("is_active", true),
        supabase
            .from("grade_subjects")
            .select("grade_id, subject_id, unit_count, lesson_count, exercise_count")
            .eq("is_active", true),
    ]);

    // Combine data: each grade has a list of subjects with statistics
    const gradesWithSubjects = grades?.map((grade) => {
        const gradeSubjectsList = subjects
            ?.map((subject) => {
                const stats = gradeSubjects?.find(
                    (gs) => gs.grade_id === grade.id && gs.subject_id === subject.id
                );
                if (!stats) return null;
                return {
                    ...subject,
                    unit_count: stats.unit_count || 0,
                    lesson_count: stats.lesson_count || 0,
                    exercise_count: stats.exercise_count || 0,
                };
            })
            .filter(Boolean);

        return { ...grade, subjects: gradeSubjectsList };
    }) || [];

    return (
        <section className="cb-grades-section" id="grades">
            <div className="container">
                <div className="cb-section-title">
                    <h2>🎓 Choose Your Grade</h2>
                    <p>Pick the right level and start your exciting learning journey!</p>
                </div>
                <div className="cb-grades-grid">
                    {gradesWithSubjects.map((grade) => (
                        <GradeCard key={grade.id} grade={grade} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default GradeCards;
