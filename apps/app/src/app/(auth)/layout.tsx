import { AuthIllustration } from '@bandzen/ui/components/auth-illustration';
import { Wordmark } from '@bandzen/ui/components/wordmark';

/**
 * shadcn's login-02 split: the form on the left, a picture on the right from
 * `lg` up. Every auth screen shares it, so none of them looks a generation
 * older than the rest. The picture is `AuthIllustration`.
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
      <div className="hidden items-center justify-center bg-muted p-16 lg:flex">
        <AuthIllustration className="max-w-lg" />
      </div>
    </main>
  );
}
