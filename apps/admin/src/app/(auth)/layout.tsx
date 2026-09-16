import { BandRulerArt } from '@bandzen/ui/components/band-ruler-art';
import { Wordmark } from '@bandzen/ui/components/wordmark';

/** The same split as apps/app's auth layout; the ruler picks up the CMS's plum. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          {/* No `collapse` here — the wordmark is the only branding on the page,
              and the tag is what says which of the two sign-ins this is. */}
          <Wordmark href="/" tag="CMS" />
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
