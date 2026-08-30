import { AiAnalysisSection } from '@/components/marketing/ai-analysis-section';
import { ComparisonSection } from '@/components/marketing/comparison-section';
import { CredibilityStrip } from '@/components/marketing/credibility-strip';
import { DiagnosticCta } from '@/components/marketing/diagnostic-cta';
import { Faq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/final-cta';
import { Footer } from '@/components/marketing/footer';
import { Hero } from '@/components/marketing/hero';
import { MockTestSection } from '@/components/marketing/mock-test-section';
import { ModulesSection } from '@/components/marketing/modules-section';
import { Navbar } from '@/components/marketing/navbar';
import { Pricing } from '@/components/marketing/pricing';
import { ProblemSection } from '@/components/marketing/problem-section';
import { ResourcesSection } from '@/components/marketing/resources-section';
import { RevealProvider } from '@/components/marketing/reveal-provider';
import { StudyPlanSection } from '@/components/marketing/study-plan-section';
import { Testimonials } from '@/components/marketing/testimonials';

export default function Home() {
  return (
    <>
      <RevealProvider />
      <Navbar />
      <main id="main" className="flex-1">
        {/* The narrative: I want a higher band → I'm stuck and don't know why →
            Bandzen finds the weakness → gives realistic practice → explains it →
            builds the plan → I can see myself reaching the target. */}
        <Hero />
        <CredibilityStrip />
        <ProblemSection />
        <ModulesSection />
        <MockTestSection />
        <AiAnalysisSection />
        <ComparisonSection />
        <StudyPlanSection />
        <ResourcesSection />
        <DiagnosticCta />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
