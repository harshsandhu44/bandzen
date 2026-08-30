import { modules } from '@/content/sections';

import { ModuleListening } from './module-listening';
import { ModuleReading } from './module-reading';
import { ModuleSpeaking } from './module-speaking';
import { ModuleWriting } from './module-writing';
import { Container, Eyebrow } from './section';

export function ModulesSection() {
  return (
    <section
      id="modules"
      className="bg-secondary text-ink relative isolate py-24 md:py-32 lg:py-40"
    >
      <Container>
        <div className="max-w-3xl">
          <Eyebrow>{modules.eyebrow}</Eyebrow>
          <h2 className="font-display text-display-2 mt-6 text-balance">
            {modules.headline}
          </h2>
          <p className="text-slate mt-6 max-w-xl leading-relaxed">
            {modules.support}
          </p>
        </div>

        {/* Asymmetric on purpose: 7/5 then 5/7, so the eye never settles into
            a grid of equal cards. */}
        <div className="bz-stagger mt-16 grid gap-6 lg:grid-cols-12">
          <ModuleReading className="lg:col-span-7" />
          <ModuleListening className="lg:col-span-5" />
          <ModuleWriting className="lg:col-span-5" />
          <ModuleSpeaking className="lg:col-span-7" />
        </div>
      </Container>
    </section>
  );
}
