"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── helpers ────────────────────────────────────────────────
function checkAnswer(exercise, userAnswer) {
    if (exercise.question_type === "fill_blank") {
        const accepted = (exercise.correct_answer ?? "")
            .split("|")
            .map((s) => s.trim().toLowerCase());
        return accepted.includes(userAnswer.trim().toLowerCase());
    }
    // multiple_choice / true_false: check via option.is_correct
    const chosen = getEffectiveOptions(exercise).find(
        (o) => o.id === userAnswer
    );
    return chosen?.is_correct === true;
}

// ─── auto-generate True/False options when DB has none ──────
function getEffectiveOptions(exercise) {
    if (exercise.question_type !== "true_false") return exercise.exercise_options ?? [];
    if ((exercise.exercise_options ?? []).length > 0) return exercise.exercise_options;

    // Derive which is correct from correct_answer field (e.g. "true"/"false"/"1"/"0")
    const ca = (exercise.correct_answer ?? "").trim().toLowerCase();
    const trueIsCorrect = ca === "true" || ca === "1" || ca === "yes";
    return [
        { id: "tf-true", option_label: "A", option_text: "True", is_correct: trueIsCorrect, order_index: 1 },
        { id: "tf-false", option_label: "B", option_text: "False", is_correct: !trueIsCorrect, order_index: 2 },
    ];
}

function StarRating({ correct, total }) {
    const pct = total === 0 ? 0 : correct / total;
    const stars = pct === 1 ? 3 : pct >= 0.6 ? 2 : 1;
    return (
        <div className="cb-stars">
            {[1, 2, 3].map((n) => (
                <span
                    key={n}
                    className={`cb-star ${n <= stars ? "cb-star--lit" : ""}`}
                >
                    ★
                </span>
            ))}
        </div>
    );
}

// ─── main component ───────────────────────────────────────────
export default function ExercisePlayer({
    exercises,
    exerciseResults, // passed from server page
    lesson,
    unit,
    grade,
    subject,
    unitsHref,
}) {
    const [hasStarted, setHasStarted] = useState(!exerciseResults || exerciseResults.length === 0);
    const [playMode, setPlayMode] = useState("all");
    const [shuffledIds, setShuffledIds] = useState([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState(""); // option id (mc/tf) or string (fill)
    const [submitted, setSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [finished, setFinished] = useState(false);
    const [visible, setVisible] = useState(true); // for fade animation
    const [hintOpen, setHintOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState("other");
    const [reportContent, setReportContent] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportDone, setReportDone] = useState(false);

    // ── progress tracking ────────────────────────────────────────
    // Whether the hint was opened for the CURRENT question
    const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
    // Unix-ms timestamp when the current question was first shown
    const [questionStartTime, setQuestionStartTime] = useState(() => Date.now());

    // ── Derived variables for progress modes ─────────────────────
    const wrongIds = exerciseResults?.filter(r => !r.is_correct).map(r => r.exercise_id) || [];
    const doneIds = exerciseResults?.map(r => r.exercise_id) || [];
    const remainingIds = exercises.filter(e => !doneIds.includes(e.id)).map(e => e.id);

    let activeList = exercises;
    if (playMode === "wrong") activeList = exercises.filter(e => wrongIds.includes(e.id));
    if (playMode === "remaining") activeList = exercises.filter(e => remainingIds.includes(e.id));
    if (playMode === "random") activeList = shuffledIds.map(id => exercises.find(e => e.id === id)).filter(Boolean);

    const exercise = activeList[currentIndex];
    const isFillBlank = exercise?.question_type === "fill_blank";
    const canSubmit = isFillBlank
        ? userAnswer.trim().length > 0
        : userAnswer !== "";

    // ── save progress (fire-and-forget, only if user is logged in) ──
    const saveProgress = useCallback(
        async (exerciseId, correct, hintUsed, timeSecs) => {
            try {
                await fetch("/api/progress", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        exercise_id: exerciseId,
                        lesson_id: lesson.id,
                        unit_id: unit.id,
                        is_correct: correct,
                        hint_used: hintUsed,
                        time_secs: timeSecs,
                    }),
                });
            } catch {
                // Silently ignore — progress is optional
            }
        },
        [lesson.id, unit.id]
    );

    // ── submit ──────────────────────────────────────────────────
    function handleSubmit() {
        if (!canSubmit || submitted) return;
        const correct = checkAnswer(exercise, userAnswer);
        setIsCorrect(correct);
        setSubmitted(true);
        if (correct) setCorrectCount((c) => c + 1);
        const timeSecs = Math.round((Date.now() - questionStartTime) / 1000);
        saveProgress(exercise.id, correct, hintUsedThisQuestion, timeSecs);
    }

    // ── advance to next question ────────────────────────────────
    function advance() {
        const next = currentIndex + 1;
        // Fade out
        setVisible(false);
        setTimeout(() => {
            if (next >= activeList.length) {
                setFinished(true);
            } else {
                setCurrentIndex(next);
                setUserAnswer("");
                setSubmitted(false);
                setIsCorrect(false);
                setHintOpen(false);
                // Reset per-question tracking for the new question
                setHintUsedThisQuestion(false);
                setQuestionStartTime(Date.now());
            }
            setVisible(true);
        }, 260);
    }

    // Auto-advance on correct after short delay
    useEffect(() => {
        if (submitted && isCorrect) {
            const t = setTimeout(advance, 900);
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitted, isCorrect]);

    // ── submit report ────────────────────────────────────────────
    async function handleReport() {
        if (!reportContent.trim() || reportSubmitting) return;
        setReportSubmitting(true);
        try {
            await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    exercise_id: exercise.id,
                    reason: reportReason,
                    content: reportContent,
                }),
            });
            setReportDone(true);
            setReportContent("");
            setReportReason("other");
            setTimeout(() => {
                setReportOpen(false);
                setReportDone(false);
            }, 1800);
        } catch {
            // silently fail
        } finally {
            setReportSubmitting(false);
        }
    }

    // ── handle Enter key in fill_blank input ────────────────────
    function handleKeyDown(e) {
        if (e.key === "Enter" && canSubmit && !submitted) handleSubmit();
    }

    const progress = activeList.length > 0 ? ((currentIndex) / activeList.length) * 100 : 0;

    // ── START SCREEN (If user has progress) ────────────────────
    if (!hasStarted) {
        return (
            <div className="cb-completion-screen">
                <div className="cb-completion-card">
                    <div className="cb-completion-emoji">🎯</div>
                    <h2 className="cb-completion-title">Your Progress</h2>
                    <p className="cb-completion-subtitle">
                        You have completed {doneIds.length} out of {exercises.length} exercises.
                    </p>
                    <div className="cb-completion-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', width: '100%', maxWidth: '300px', marginInline: 'auto' }}>
                        <button className="cb-submit-btn" style={{ width: '100%', boxSizing: 'border-box' }} onClick={() => { setPlayMode("all"); setHasStarted(true); }}>
                            Start Over (All)
                        </button>
                        {remainingIds.length > 0 && (
                            <button className="cb-restart-btn" style={{ width: '100%', boxSizing: 'border-box' }} onClick={() => { setPlayMode("remaining"); setHasStarted(true); }}>
                                Do Remaining ({remainingIds.length})
                            </button>
                        )}
                        {wrongIds.length > 0 && (
                            <button className="cb-restart-btn" style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#f87171', width: '100%', boxSizing: 'border-box' }} onClick={() => { setPlayMode("wrong"); setHasStarted(true); }}>
                                Redo Wrong ({wrongIds.length})
                            </button>
                        )}
                        {exercises.length > 1 && (
                            <button className="cb-restart-btn" style={{ width: '100%', boxSizing: 'border-box' }} onClick={() => {
                                const shuffled = [...exercises].sort(() => 0.5 - Math.random()).slice(0, 10).map(e => e.id);
                                setShuffledIds(shuffled);
                                setPlayMode("random");
                                setHasStarted(true);
                            }}>
                                Random {Math.min(10, exercises.length)}
                            </button>
                        )}
                    </div>
                    <div style={{ marginTop: '32px', textAlign: 'center' }}>
                        <Link href={unitsHref} className="cb-submit-btn" style={{ display: 'inline-block', width: '100%', maxWidth: '180px', boxSizing: 'border-box', textDecoration: 'none' }}>
                            ← Back to list
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── COMPLETION SCREEN ───────────────────────────────────────
    if (finished) {
        const pct = activeList.length > 0 ? Math.round((correctCount / activeList.length) * 100) : 0;
        return (
            <div className="cb-completion-screen">
                <div className="cb-completion-card">
                    <div className="cb-completion-emoji">🎉</div>
                    <h2 className="cb-completion-title">Completed!</h2>
                    <p className="cb-completion-subtitle">
                        {lesson.lesson_number} {lesson.title.replace(lesson.lesson_number + " ", "")}
                        {playMode !== "all" && ` (${playMode === "wrong" ? "Redo Wrong" : "Remaining"})`}
                    </p>

                    <StarRating correct={correctCount} total={activeList.length} />

                    <div className="cb-completion-score">
                        <span className="cb-score-num">{correctCount}</span>
                        <span className="cb-score-sep">/</span>
                        <span className="cb-score-total">{activeList.length}</span>
                        <span className="cb-score-pct">({pct}%)</span>
                    </div>

                    <div className="cb-completion-actions">
                        <button
                            className="cb-restart-btn"
                            onClick={() => {
                                setCurrentIndex(0);
                                setUserAnswer("");
                                setSubmitted(false);
                                setIsCorrect(false);
                                setCorrectCount(0);
                                setFinished(false);
                                setVisible(true);
                                setHintOpen(false);
                            }}
                        >
                            🔄 Try Again
                        </button>
                        <Link href={unitsHref} className="cb-back-units-btn">
                            ← Back to list
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── EXERCISE SCREEN ─────────────────────────────────────────
    return (
        <div className={`cb-ex-player ${visible ? "cb-ex-visible" : "cb-ex-hidden"}`}>
            {/* Progress bar */}
            <div className="cb-ex-progress-wrap">
                <div className="cb-ex-progress-bar">
                    <div
                        className="cb-ex-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="cb-ex-progress-label">
                    {currentIndex + 1} / {activeList.length}
                </span>
            </div>

            {/* Card */}
            <div className="cb-ex-card">
                {/* Report button */}
                <button
                    className="cb-report-btn"
                    onClick={() => {
                        setReportOpen(true);
                        setReportDone(false);
                    }}
                    title="Report an issue with this exercise"
                >
                    🚩
                </button>
                {/* Difficulty badge */}
                <div className="cb-ex-meta">
                    <span className="cb-ex-lesson-tag">
                        {subject.icon} {lesson.lesson_number}
                    </span>
                    <span className="cb-ex-difficulty">
                        {"★".repeat(exercise.difficulty ?? 1)}
                        {"☆".repeat(3 - (exercise.difficulty ?? 1))}
                    </span>
                    <span className="cb-ex-points">+{exercise.points ?? 10} pts</span>
                </div>

                {/* Question */}
                <div className="cb-ex-question">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {(exercise.question ?? "").replace(/\\n/g, "\n")}
                    </ReactMarkdown>
                </div>

                {/* Exercise image */}
                {exercise.image_url && (
                    <div className="cb-ex-image-wrap">
                        <Image
                            src={exercise.image_url}
                            alt="Exercise illustration"
                            width={600}
                            height={400}
                            className="cb-ex-image"
                            style={{ width: "100%", height: "auto" }}
                            unoptimized
                        />
                    </div>
                )}

                {/* Hint */}
                {exercise.hint && !submitted && (
                    <div
                        className={`cb-ex-hint ${hintOpen ? "cb-ex-hint--open" : "cb-ex-hint--closed"}`}
                        onClick={() => {
                            setHintOpen((v) => !v);
                            // Mark hint as used for this question (cumulative – never resets)
                            if (!hintUsedThisQuestion) setHintUsedThisQuestion(true);
                        }}
                        title={hintOpen ? "Hide hint" : "Show hint"}
                        style={{ cursor: "pointer" }}
                    >
                        <span className="cb-ex-hint-icon">💡</span>
                        {hintOpen && <em className="cb-ex-hint-text">{exercise.hint}</em>}
                    </div>
                )}

                {/* Answer area */}
                {isFillBlank ? (
                    <div className="cb-fill-wrap">
                        <input
                            type="text"
                            className={`cb-fill-input ${submitted
                                ? isCorrect
                                    ? "cb-fill-correct"
                                    : "cb-fill-wrong"
                                : ""
                                }`}
                            value={userAnswer}
                            onChange={(e) => {
                                if (!submitted) setUserAnswer(e.target.value);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter answer..."
                            autoFocus
                            disabled={submitted}
                        />
                    </div>
                ) : (
                    <div className="cb-options-list">
                        {getEffectiveOptions(exercise).map((opt) => {
                            let stateClass = "";
                            if (submitted) {
                                if (opt.is_correct) stateClass = "cb-opt-correct";
                                else if (opt.id === userAnswer) stateClass = "cb-opt-wrong";
                            } else if (opt.id === userAnswer) {
                                stateClass = "cb-opt-selected";
                            }
                            return (
                                <button
                                    key={opt.id}
                                    className={`cb-option-btn ${stateClass}`}
                                    onClick={() => {
                                        if (!submitted) setUserAnswer(opt.id);
                                    }}
                                    disabled={submitted}
                                >
                                    <span className="cb-opt-label">{opt.option_label}</span>
                                    <span className="cb-opt-text">{opt.option_text}</span>
                                    {opt.option_image_url && (
                                        <Image
                                            src={opt.option_image_url}
                                            alt={`Option ${opt.option_label}`}
                                            width={300}
                                            height={200}
                                            className="cb-opt-image"
                                            style={{ width: "100%", height: "auto", marginTop: "6px" }}
                                            unoptimized
                                        />
                                    )}
                                    {submitted && opt.is_correct && (
                                        <span className="cb-opt-icon">✓</span>
                                    )}
                                    {submitted && opt.id === userAnswer && !opt.is_correct && (
                                        <span className="cb-opt-icon">✗</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Submit button */}
                {!submitted && (
                    <button
                        className="cb-submit-btn"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                    >
                        Check Answer
                    </button>
                )}

                {/* Correct feedback */}
                {submitted && isCorrect && (
                    <div className="cb-feedback-correct">
                        <span className="cb-feedback-icon">🎉</span>
                        <span className="cb-feedback-text">Correct! Well done!</span>
                    </div>
                )}

                {/* Wrong feedback */}
                {submitted && !isCorrect && (
                    <div className="cb-feedback-wrong">
                        <div className="cb-feedback-header">
                            <span className="cb-feedback-icon">💡</span>
                            <strong>Solution Guide</strong>
                        </div>
                        <div className="cb-feedback-explanation">
                            {exercise.explanation ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {exercise.explanation.replace(/\\n/g, "\n")}
                                </ReactMarkdown>
                            ) : (
                                "Review the correct answer above."
                            )}
                        </div>
                        <button className="cb-got-it-btn" onClick={advance}>
                            Got It →
                        </button>
                    </div>
                )}
            </div>

            {/* Report modal */}
            {reportOpen && (
                <div className="cb-report-overlay" onClick={(e) => { if (e.target === e.currentTarget) setReportOpen(false); }}>
                    <div className="cb-report-modal">
                        <div className="cb-report-modal-header">
                            <span>🚩 Report an Issue</span>
                            <button className="cb-report-close" onClick={() => setReportOpen(false)}>✕</button>
                        </div>

                        {reportDone ? (
                            <div className="cb-report-success">
                                <span>✅</span>
                                <p>Thank you! Your report has been submitted.</p>
                            </div>
                        ) : (
                            <>
                                <div className="cb-report-field">
                                    <label className="cb-report-label">Reason</label>
                                    <select
                                        className="cb-report-select"
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                    >
                                        <option value="wrong_answer">Wrong answer</option>
                                        <option value="typo">Typo / spelling error</option>
                                        <option value="unclear">Unclear question</option>
                                        <option value="broken_image">Broken image</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="cb-report-field">
                                    <label className="cb-report-label">Description</label>
                                    <textarea
                                        className="cb-report-textarea"
                                        rows={4}
                                        placeholder="Describe the issue..."
                                        value={reportContent}
                                        onChange={(e) => setReportContent(e.target.value)}
                                    />
                                </div>

                                <button
                                    className="cb-report-submit"
                                    onClick={handleReport}
                                    disabled={!reportContent.trim() || reportSubmitting}
                                >
                                    {reportSubmitting ? "Submitting..." : "Submit Report"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
