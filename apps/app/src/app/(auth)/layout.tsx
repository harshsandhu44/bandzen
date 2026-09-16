import { BandRulerArt } from '@bandzen/ui/components/band-ruler-art';
import { Wordmark } from '@bandzen/ui/components/wordmark';

/**
 * shadcn's login-02 split: the form on the left, a picture on the right from
 * `lg` up. Every auth screen shares it, so none of them looks a generation
 * older than the rest. The picture is the band ruler; see `BandRulerArt`.
 */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Wordmark href="/" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <BandRulerArt className="absolute inset-0 size-full" />
      </div>
    </main>
  );
}
