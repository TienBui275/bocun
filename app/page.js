import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import GradeCards from "@/components/Home/GradeCards";

const HeroSection = () => (
  <section className="cb-hero">
    <div className="container">
      <h1 className="cb-hero-title">
        <span className="highlight" style={{ display: 'inline-block' }}>
          Learn Smarter,<br />
          Grow Faster!
        </span>
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
    <div className="cb-hero-wave">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100px' }}>
        <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" fill="#FFF4E5"></path>
      </svg>
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
