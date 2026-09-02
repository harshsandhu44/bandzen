import { Button } from '@bandzen/ui/components/button';
import { Version } from '@bandzen/ui/components/version';

import pkg from '../../package.json';

const variants = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
] as const;

const sizes = ['xs', 'sm', 'default', 'lg'] as const;

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading">@bandzen/ui</h1>
        <p className="text-muted-foreground text-sm">
          Every component here is imported from the shared package. This app
          overrides <code className="font-mono">--primary</code> in its own{' '}
          <code className="font-mono">globals.css</code>, so it renders the same
          components in a different theme than web.
        </p>
        <Version value={pkg.version} />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Button — variants</h2>
        <div className="flex flex-wrap items-center gap-2">
          {variants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Button — sizes</h2>
        <div className="flex flex-wrap items-center gap-2">
          {sizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Button — disabled</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled>default</Button>
          <Button variant="outline" disabled>
            outline
          </Button>
        </div>
      </section>
    </main>
  );
}
