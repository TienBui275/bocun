import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

export async function generateMetadata({ params, searchParams }) {
    const { gradeSlug } = await params;
    const { subject: subjectSlug } = await searchParams;
    return {
        title: `${gradeSlug} · ${subjectSlug ?? "Select Subject"}`,
    };
}

export default async function GradeSubjectPage({ params, searchParams }) {
    const { gradeSlug } = await params;
    const { subject: subjectSlug } = await searchParams;

    const supabase = await createClient();

    // Fetch grade + subject song song
    const [{ data: grade }, { data: subject }] = await Promise.all([
        supabase
            .from("grades")
            .select("id, name, slug, badge_label, color, description, level_order")
            .eq("slug", gradeSlug)
            .eq("is_active", true)
            .single(),
        supabase
            .from("subjects")
            .select("id, name, slug, icon, color")
            .eq("slug", subjectSlug ?? "")
            .single(),
    ]);

    if (!grade) notFound();

    // No subject selected → show subject list for this grade
    if (!subjectSlug || !subject) {
        return <SubjectSelectionPage grade={grade} />;
    }

    // Fetch units (with lessons) for grade + subject
    const { data: units, error } = await supabase
        .from("units")
        .select(`
            id, title, slug, unit_number, description, order_index, lesson_count,
            lessons (
                id, title, slug, lesson_number, order_index, exercise_count
            )
        `)
        .eq("grade_id", grade.id)
        .eq("subject_id", subject.id)
        .eq("is_active", true)
        .order("order_index")
        .order("order_index", { referencedTable: "lessons" });

    if (error) {
        console.error("Error fetching units:", error);
    }

    // Fetch progress if logged in
    let progressMap = {};
    const { data: { user } } = await supabase.auth.getUser();
    if (user && units && units.length > 0) {
        const unitIds = units.map(u => u.id);
        const { data: progressList } = await supabase
            .from("v_lesson_progress")
            .select("*")
            .eq("user_id", user.id)
            .in("unit_id", unitIds);

        if (progressList) {
            progressList.forEach(p => {
                progressMap[p.lesson_id] = p;
            });
        }
    }

    const gradeColor = "#FF8A00";

    return (
        <>
            <Header />
            <main className="cb-units-page" style={{ "--grade-color": gradeColor }}>

                {/* Breadcrumb */}
                <div className="cb-breadcrumb-bar" style={{ borderColor: gradeColor }}>
                    <div className="container">
                        <nav className="cb-breadcrumb">
                            <Link href="/" className="cb-bc-link">🏠 Home</Link>
                            <span className="cb-bc-sep">›</span>
                            <span className="cb-bc-current">{grade.name}</span>
                            <span className="cb-bc-sep">›</span>
                            <span className="cb-bc-current">
                                {subject.icon} {subject.name}
                            </span>
                        </nav>
                    </div>
                </div>

                {/* Hero header */}
                <section className="cb-units-hero">
                    <div className="container">
                        <div className="cb-units-hero-inner">
                            <div className="cb-units-badge" style={{ background: gradeColor }}>
                                {grade.badge_label}
                            </div>
                            <div className="cb-units-hero-text">
                                <h1 className="cb-units-title" style={{ color: gradeColor }}>
                                    {subject.icon} {subject.name} — {grade.name}
                                </h1>
                                <p className="cb-units-subtitle">
                                    {units?.length || 0} units · {units?.reduce((acc, u) => acc + (u.lesson_count || 0), 0)} lessons
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Units list */}
                <section className="cb-units-section">
                    <div className="container">
                        {!units || units.length === 0 ? (
                            <div className="cb-empty-state">
                                <span className="cb-empty-icon">📚</span>
                                <p>Content is being prepared, please check back later!</p>
                            </div>
                        ) : (
                            <div className="cb-units-list">
                                {units.map((unit) => (
                                    <div
                                        key={unit.id}
                                        className="cb-unit-card"
                                        style={{ "--unit-color": gradeColor }}
                                    >
                                        {/* Unit header */}
                                        <div className="cb-unit-header">
                                            <div className="cb-unit-number" style={{ background: gradeColor }}>
                                                {unit.unit_number}
                                            </div>
                                            <div className="cb-unit-info">
                                                <h2 className="cb-unit-title">{unit.title}</h2>
                                                {unit.description ? (
                                                    <p className="cb-unit-desc">{unit.description}</p>
                                                ) : null}
                                            </div>
                                            <div className="cb-unit-meta">
                                                <span className="cb-unit-count">
                                                    {unit.lesson_count || (unit.lessons && unit.lessons.length) || 0} lessons
                                                </span>
                                            </div>
                                        </div>

                                        {/* Lessons list */}
                                        {Array.isArray(unit.lessons) && unit.lessons.length > 0 ? (
                                            <div className="cb-lessons-grid">
                                                {[...unit.lessons]
                                                    .sort((a, b) => a.order_index - b.order_index)
                                                    .map((lesson) => (
                                                        <Link
                                                            key={lesson.id}
                                                            href={`/grade/${gradeSlug}/${subject.slug}/${unit.slug}/${lesson.slug}`}
                                                            className="cb-lesson-card"
                                                        >
                                                            <span className="cb-lesson-number" style={{ color: gradeColor }}>
                                                                {lesson.lesson_number}
                                                            </span>
                                                            <span className="cb-lesson-title">
                                                                {lesson.title.replace(lesson.lesson_number + " ", "")}
                                                            </span>
                                                            <span className="cb-lesson-exercises">
                                                                {lesson.exercise_count > 0 ? (
                                                                    progressMap[lesson.id] ? (
                                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                                                            <span className="cb-lesson-badge" style={{ backgroundColor: "#e2ffe8", padding: "2px 8px", borderRadius: "12px", color: "#16a34a", fontWeight: "bold", fontSize: "0.85rem" }}>
                                                                                {Math.round((progressMap[lesson.id].done_count / lesson.exercise_count) * 100)}%
                                                                            </span>
                                                                            <span>{lesson.exercise_count} exercises</span>
                                                                        </span>
                                                                    ) : (
                                                                        `${lesson.exercise_count} exercises`
                                                                    )
                                                                ) : "Coming Soon"}
                                                            </span>
                                                            <span className="cb-lesson-arrow" style={{ color: gradeColor }}>›</span>
                                                        </Link>
                                                    ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}

// Sub-component: shown when no subject is selected
async function SubjectSelectionPage({ grade }) {
    const supabase = await createClient();
    const gradeColor = "#FF8A00";

    const { data: gradeSubjects } = await supabase
        .from("grade_subjects")
        .select("subject_id, unit_count, exercise_count, subjects(id, name, slug, icon)")
        .eq("grade_id", grade.id)
        .eq("is_active", true);

    return (
        <>
            <Header />
            <main className="cb-units-page" style={{ "--grade-color": gradeColor }}>
                <div className="cb-breadcrumb-bar" style={{ borderColor: gradeColor }}>
                    <div className="container">
                        <nav className="cb-breadcrumb">
                            <Link href="/" className="cb-bc-link">🏠 Home</Link>
                            <span className="cb-bc-sep">›</span>
                            <span className="cb-bc-current">{grade.name}</span>
                        </nav>
                    </div>
                </div>

                <section className="cb-units-hero">
                    <div className="container">
                        <div className="cb-units-hero-inner">
                            <div className="cb-units-badge" style={{ background: gradeColor }}>
                                {grade.badge_label}
                            </div>
                            <div className="cb-units-hero-text">
                                <h1 className="cb-units-title" style={{ color: gradeColor }}>
                                    {grade.name}
                                </h1>
                                <p className="cb-units-subtitle">Select a subject to view content</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cb-units-section">
                    <div className="container">
                        <div className="cb-subject-select-grid">
                            {gradeSubjects?.map(({ subjects: sub, unit_count, exercise_count }) =>
                                sub ? (
                                    <Link
                                        key={sub.id}
                                        href={`/grade/${grade.slug}?subject=${sub.slug}`}
                                        className="cb-subject-select-card"
                                        style={{ "--unit-color": gradeColor }}
                                    >
                                        <span className="cb-subject-select-icon">{sub.icon}</span>
                                        <span className="cb-subject-select-name">{sub.name}</span>
                                        <span className="cb-subject-select-meta">
                                            {unit_count} units · {exercise_count} exercises
                                        </span>
                                    </Link>
                                ) : null
                            )}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
