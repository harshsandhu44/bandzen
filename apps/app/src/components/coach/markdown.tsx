import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Coach replies are markdown — lists, bold, the occasional table. Rendered
 * with the app's own type rather than a prose reset: tight spacing, sentence
 * scale, links underlined the way every other link in the app is.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="max-w-prose space-y-3 text-sm/relaxed text-pretty">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-medium">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-none bg-secondary px-1 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <p className="font-title text-title">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="font-title text-title">{children}</p>
          ),
          h3: ({ children }) => <p className="font-medium">{children}</p>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
