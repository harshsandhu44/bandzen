import { HighlightText } from './highlights';

/**
 * A passage body the way the paper prints it: blank-line-separated
 * paragraphs, each its own highlight block keyed `<passageId>:<index>`.
 */
export function Passage({ id, body }: { id: string; body: string }) {
  return (
    <>
      {body.split(/\n\s*\n/).map((para, i) => (
        <HighlightText
          key={i}
          id={`${id}:${i}`}
          text={para}
          className="mb-4 text-sm leading-7 whitespace-pre-line"
        />
      ))}
    </>
  );
}
