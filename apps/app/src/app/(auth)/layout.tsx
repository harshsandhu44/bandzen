import Link from 'next/link';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="font-mono text-xs tracking-widest text-muted-foreground uppercase"
        >
          Bandzen
        </Link>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
