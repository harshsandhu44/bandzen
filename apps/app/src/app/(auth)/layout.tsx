import { Wordmark } from '@/components/app/wordmark';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Wordmark href="/" />
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
