import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import GradeCards from "@/components/Home/GradeCards";

const HeroSection = () => (
  <section className="cb-hero">
    <div className="container">
      <div className="cb-hero-badge">
        ✨ The #1 learning platform for elementary school students
      </div>
      <h1 className="cb-hero-title">
        Learn <span className="highlight">smarter</span>,<br />
        Grow <span className="highlight">faster</span>!
      </h1>
      <p className="cb-hero-desc">
        Over <strong>1,000+</strong> interactive exercises for Math, Science, and English
        from Pre-K to Grade 5. Students learn with instant guidance when needed!
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
