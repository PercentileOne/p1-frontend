import Nav from './components/Nav'
import HeroSection from './components/HeroSection'
import PhilosophySection from './components/PhilosophySection'
import PillarsSection from './components/PillarsSection'
import CockpitSection from './components/CockpitSection'
import P1ScoreSection from './components/P1ScoreSection'
import PercentileSection from './components/PercentileSection'
import StorySection from './components/StorySection'
import TopStoriesSection from './components/TopStoriesSection'
import PricingSection from './components/PricingSection'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .p1-fade-up {
          opacity: 0;
          animation: fadeUp .7s cubic-bezier(.16,1,.3,1) forwards;
        }
        section { scroll-margin-top: 72px; }
      `}</style>
      <Nav />
      <HeroSection />
      <PhilosophySection />
      <PillarsSection />
      <CockpitSection />
      <P1ScoreSection />
      <PercentileSection />
      <StorySection />
      <TopStoriesSection />
      <PricingSection />
      <Footer />
    </>
  )
}
