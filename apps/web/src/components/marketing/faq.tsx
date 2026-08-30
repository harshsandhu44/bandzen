import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@bandzen/ui/components/accordion';

import { brand, faq } from '@/content/sections';

import { Container, Eyebrow } from './section';

export function Faq() {
  return (
    <section className="bg-secondary text-ink relative isolate py-24 md:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <Eyebrow>{faq.eyebrow}</Eyebrow>
              <h2 className="font-display text-display-2 mt-6">
                {faq.headline}
              </h2>
            </div>
          </div>

          <div className="lg:col-span-8">
            <Accordion className="border-ink border-t">
              {faq.items.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="border-ink border-b"
                >
                  <AccordionTrigger className="py-6 text-left">
                    <span className="font-display pr-4 text-xl sm:text-2xl">
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-slate max-w-2xl pb-6 text-sm leading-relaxed">
                      {item.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <aside className="border-ink mt-10 border-l-2 py-2 pl-5">
              <p className="text-slate text-xs leading-relaxed">
                {brand.disclaimer}
              </p>
            </aside>
          </div>
        </div>
      </Container>
    </section>
  );
}
