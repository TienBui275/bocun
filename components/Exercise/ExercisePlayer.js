"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

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
    const trueIsCorrect = ca === "true" || ca === "1" || ca === "đúng" || ca === "yes";
    return [
        { id: "tf-true",  option_label: "A", option_text: "Đúng (True)",  is_correct: trueIsCorrect,  order_index: 1 },
        { id: "tf-false", option_label: "B", option_text: "Sai (False)", is_correct: !trueIsCorrect, order_index: 2 },
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
    lesson,
    unit,
    grade,
    subject,
    unitsHref,
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState(""); // option id (mc/tf) or string (fill)
    const [submitted, setSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [finished, setFinished] = useState(false);
    const [visible, setVisible] = useState(true); // for fade animation
    const [hintOpen, setHintOpen] = useState(false);

    const exercise = exercises[currentIndex];
    const isFillBlank = exercise?.question_type === "fill_blank";
    const canSubmit = isFillBlank
        ? userAnswer.trim().length > 0
        : userAnswer !== "";

    // ── save progress (fire-and-forget, only if user is logged in) ──
    const saveProgress = useCallback(
        async (exerciseId, correct, answer) => {
            try {
                await fetch("/api/progress", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        exercise_id: exerciseId,
                        lesson_id: lesson.id,
                        unit_id: unit.id,
                        is_correct: correct,
                        answer_given: String(answer),
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
        saveProgress(exercise.id, correct, userAnswer);
    }

    // ── advance to next question ────────────────────────────────
    function advance() {
        const next = currentIndex + 1;
        // Fade out
        setVisible(false);
        setTimeout(() => {
            if (next >= exercises.length) {
                setFinished(true);
            } else {
                setCurrentIndex(next);
                setUserAnswer("");
                setSubmitted(false);
                setIsCorrect(false);
                setHintOpen(false);
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

    // ── handle Enter key in fill_blank input ────────────────────
    function handleKeyDown(e) {
        if (e.key === "Enter" && canSubmit && !submitted) handleSubmit();
    }

    const progress = ((currentIndex) / exercises.length) * 100;

    // ── COMPLETION SCREEN ───────────────────────────────────────
    if (finished) {
        const pct = Math.round((correctCount / exercises.length) * 100);
        return (
            <div className="cb-completion-screen">
                <div className="cb-completion-card">
                    <div className="cb-completion-emoji">🎉</div>
                    <h2 className="cb-completion-title">Hoàn thành!</h2>
                    <p className="cb-completion-subtitle">
                        {lesson.lesson_number} {lesson.title.replace(lesson.lesson_number + " ", "")}
                    </p>

                    <StarRating correct={correctCount} total={exercises.length} />

                    <div className="cb-completion-score">
                        <span className="cb-score-num">{correctCount}</span>
                        <span className="cb-score-sep">/</span>
                        <span className="cb-score-total">{exercises.length}</span>
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
                            🔄 Làm lại
                        </button>
                        <Link href={unitsHref} className="cb-back-units-btn">
                            ← Về danh sách
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
                    {currentIndex + 1} / {exercises.length}
                </span>
            </div>

            {/* Card */}
            <div className="cb-ex-card">
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
                    {exercise.question.split("\n").map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
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
                        onClick={() => setHintOpen((v) => !v)}
                        title={hintOpen ? "Ẩn gợi ý" : "Xem gợi ý"}
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
                            className={`cb-fill-input ${
                                submitted
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
                            placeholder="Nhập đáp án..."
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
                        Kiểm tra đáp án
                    </button>
                )}

                {/* Correct feedback */}
                {submitted && isCorrect && (
                    <div className="cb-feedback-correct">
                        <span className="cb-feedback-icon">🎉</span>
                        <span className="cb-feedback-text">Chính xác! Tuyệt vời!</span>
                    </div>
                )}

                {/* Wrong feedback */}
                {submitted && !isCorrect && (
                    <div className="cb-feedback-wrong">
                        <div className="cb-feedback-header">
                            <span className="cb-feedback-icon">💡</span>
                            <strong>Hướng dẫn giải</strong>
                        </div>
                        <div className="cb-feedback-explanation">
                            {exercise.explanation
                                ? exercise.explanation.split("\n").map((line, i) => (
                                      <p key={i}>{line}</p>
                                  ))
                                : "Xem lại đáp án đúng ở trên."}
                        </div>
                        <button className="cb-got-it-btn" onClick={advance}>
                            Got It →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
