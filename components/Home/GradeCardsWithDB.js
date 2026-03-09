import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

            <p className="cb-grade-desc">{grade.description}</p>

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

const GradeCardsWithDB = async () => {
    const supabase = await createClient();

    // Get all grades
    const { data: grades, error: gradesError } = await supabase
        .from("grades")
        .select("id, name, slug, badge_label, color, description, level_order")
        .eq("is_active", true)
        .order("level_order");

    if (gradesError) {
        console.error("Error fetching grades:", gradesError);
        return <div>Unable to load grade data</div>;
    }

    // Get all subjects
    const { data: subjects, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name, slug, icon")
        .eq("is_active", true);

    if (subjectsError) {
        console.error("Error fetching subjects:", subjectsError);
    }

    // Get grade_subjects (statistics)
    const { data: gradeSubjects, error: gsError } = await supabase
        .from("grade_subjects")
        .select("grade_id, subject_id, unit_count, lesson_count, exercise_count")
        .eq("is_active", true);

    if (gsError) {
        console.error("Error fetching grade_subjects:", gsError);
    }

    // Combine data: each grade has a list of subjects with statistics
    const gradesWithSubjects = grades?.map((grade) => {
        const gradeSubjectsList = subjects
            ?.map((subject) => {
                const stats = gradeSubjects?.find(
                    (gs) => gs.grade_id === grade.id && gs.subject_id === subject.id
                );

                if (!stats) return null; // Skip subject if no data yet

                return {
                    ...subject,
                    unit_count: stats.unit_count || 0,
                    lesson_count: stats.lesson_count || 0,
                    exercise_count: stats.exercise_count || 0,
                };
            })
            .filter(Boolean); // Remove nulls

        return {
            ...grade,
            subjects: gradeSubjectsList,
        };
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

export default GradeCardsWithDB;
