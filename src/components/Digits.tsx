import type { ReactNode } from 'react';

const RUN = /(\d[\d.,:/]*\d|\d)/g;

/** Design-system rule: every number is set in the number font (Jersey 10). */
export function Digits({ children }: { children: ReactNode }) {
  if (typeof children !== 'string' && typeof children !== 'number') {
    return <>{children}</>;
  }
  const parts = String(children).split(RUN);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="dg">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}
