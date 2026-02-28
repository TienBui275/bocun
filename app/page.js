import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import GradeCards from "@/components/Home/GradeCards";

const HeroSection = () => (
  <section className="cb-hero">
    <div className="container">
      <div className="cb-hero-badge">
        ✨ Nền tảng học tập số 1 cho học sinh tiểu học
      </div>
      <h1 className="cb-hero-title">
        Học <span className="highlight">vui hơn</span>,<br />
        Giỏi <span className="highlight">nhanh hơn</span>!
      </h1>
      <p className="cb-hero-desc">
        Hơn <strong>1,000+</strong> bài tập tương tác cho các môn Toán, Khoa Học, Tiếng Anh
        từ Pre-K đến Lớp 5. Học sinh làm bài, được hướng dẫn ngay khi cần!
      </p>
      <div className="cb-emoji-row">
        <span>📐</span>
        <span>🔬</span>
        <span>📖</span>
        <span>✏️</span>
        <span>🏆</span>
      </div>
    </div>
  </section>
);

export default async function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <GradeCards />
      </main>
      <Footer />
    </>
  );
}
