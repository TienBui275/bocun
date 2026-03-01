import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import ExercisePlayer from "@/components/Exercise/ExercisePlayer";

export async function generateMetadata({ params }) {
    const { gradeSlug, subjectSlug, lessonSlug } = await params;
    return {
        title: `${lessonSlug.replace(/-/g, " ")} · ${subjectSlug} · ${gradeSlug} — Cun Bo`,
    };
}

export default async function LessonExercisePage({ params }) {
    const { gradeSlug, subjectSlug, unitSlug, lessonSlug } = await params;

    const supabase = await createClient();

    // Fetch grade + subject song song
    const [{ data: grade }, { data: subject }] = await Promise.all([
        supabase
            .from("grades")
            .select("id, name, slug, badge_label, color")
            .eq("slug", gradeSlug)
            .eq("is_active", true)
            .single(),
        supabase
            .from("subjects")
            .select("id, name, slug, icon, color")
            .eq("slug", subjectSlug)
            .single(),
    ]);

    if (!grade || !subject) notFound();

    // Fetch unit
    const { data: unit } = await supabase
        .from("units")
        .select("id, title, slug, unit_number")
        .eq("grade_id", grade.id)
        .eq("subject_id", subject.id)
        .eq("slug", unitSlug)
        .eq("is_active", true)
        .single();

    if (!unit) notFound();

    // Fetch lesson
    const { data: lesson } = await supabase
        .from("lessons")
        .select("id, title, slug, lesson_number, description, exercise_count")
        .eq("unit_id", unit.id)
        .eq("slug", lessonSlug)
        .eq("is_active", true)
        .single();

    if (!lesson) notFound();

    // Fetch exercises + options
    const { data: exercises, error: exError } = await supabase
        .from("exercises")
        .select(`
            id, question, question_type, correct_answer, explanation, hint,
            image_url, order_index, difficulty, points,
            exercise_options (
                id, option_label, option_text, option_image_url, is_correct, order_index
            )
        `)
        .eq("lesson_id", lesson.id)
        .eq("is_active", true)
        .order("order_index");

    if (exError) {
        console.error("Error fetching exercises:", exError);
    }

    const gradeColor = grade.color ?? "#3b82f6";
    const unitsHref = `/grade/${gradeSlug}?subject=${subjectSlug}`;

    // Sort options inside each exercise
    const exercisesWithSortedOptions = (exercises ?? []).map((ex) => ({
        ...ex,
        exercise_options: [...(ex.exercise_options ?? [])].sort(
            (a, b) => a.order_index - b.order_index
        ),
    }));

    return (
        <>
            <Header />
            <main
                className="cb-exercise-page"
                style={{ "--grade-color": gradeColor }}
            >
                {/* Breadcrumb */}
                <div className="cb-ex-breadcrumb-bar">
                    <div className="container">
                        <nav className="cb-breadcrumb">
                            <Link href="/" className="cb-bc-link">🏠 Home</Link>
                            <span className="cb-bc-sep">›</span>
                            <Link href={`/grade/${gradeSlug}`} className="cb-bc-link">{grade.name}</Link>
                            <span className="cb-bc-sep">›</span>
                            <Link href={unitsHref} className="cb-bc-link">
                                {subject.icon} {subject.name}
                            </Link>
                            <span className="cb-bc-sep">›</span>
                            <Link href={unitsHref} className="cb-bc-link">{unit.title}</Link>
                            <span className="cb-bc-sep">›</span>
                            <span className="cb-bc-current">{lesson.lesson_number} {lesson.title.replace(lesson.lesson_number + " ", "")}</span>
                        </nav>
                    </div>
                </div>

                {/* Exercise Player */}
                <div className="cb-ex-wrapper">
                    <div className="container">
                        {!exercisesWithSortedOptions.length ? (
                            <div className="cb-empty-state">
                                <span className="cb-empty-icon">📝</span>
                                <p>Exercises are being prepared, please check back later!</p>
                                <Link href={unitsHref} className="cb-ex-back-link">
                                    ← Back to list
                                </Link>
                            </div>
                        ) : (
                            <ExercisePlayer
                                exercises={exercisesWithSortedOptions}
                                lesson={lesson}
                                unit={unit}
                                grade={grade}
                                subject={subject}
                                unitsHref={unitsHref}
                            />
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
