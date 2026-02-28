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

            <p className="cb-grade-desc">{grade.description || "Nội dung đang cập nhật..."}</p>

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
                                {subject.exercise_count || 0} bài tập &gt;
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

    // Lấy tất cả grades
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
                    <p className="text-center text-danger">Không thể tải dữ liệu lớp học.</p>
                </div>
            </section>
        );
    }

    // Lấy subjects và grade_subjects song song
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

    // Kết hợp dữ liệu: mỗi grade có danh sách subjects kèm thống kê
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
                    <h2>🎓 Chọn lớp của bạn</h2>
                    <p>Chọn cấp độ phù hợp và bắt đầu hành trình học tập thú vị!</p>
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
