import { Wordmark } from '@bandzen/ui/components/wordmark';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* No `collapse` here — the wordmark is the only branding on the page,
            and the tag is what says which of the two sign-ins this is. */}
        <Wordmark href="/" tag="CMS" />
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
