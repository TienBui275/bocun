"use client";

import { useState, useEffect } from "react";
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
                            <span className="subject-icon">{subject.icon || "📚"}</span>
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

const GradeCardsClient = () => {
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchGrades() {
            try {
                const res = await fetch("/api/grades-with-subjects");
                const data = await res.json();
                
                if (data.success) {
                    setGrades(data.grades);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchGrades();
    }, []);

    if (loading) {
        return (
            <section className="cb-grades-section" id="grades">
                <div className="container">
                    <div className="cb-section-title">
                        <h2>🎓 Chọn lớp của bạn</h2>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="cb-grades-section" id="grades">
                <div className="container">
                    <div className="cb-section-title">
                        <h2>🎓 Chọn lớp của bạn</h2>
                        <p style={{ color: "red" }}>Lỗi: {error}</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="cb-grades-section" id="grades">
            <div className="container">
                <div className="cb-section-title">
                    <h2>🎓 Chọn lớp của bạn</h2>
                    <p>Chọn cấp độ phù hợp và bắt đầu hành trình học tập thú vị!</p>
                </div>
                <div className="cb-grades-grid">
                    {grades.map((grade) => (
                        <GradeCard key={grade.id} grade={grade} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default GradeCardsClient;
