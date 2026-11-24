import { useEffect, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from `from` to `to` in `ms` (ease-out); jumps straight there with reduced motion. */
export function useCountUp(to: number, ms = 900, from = 0, delay = 0): number {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (reduced()) {
      const id = requestAnimationFrame(() => setV(to));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t + delay;
      const k = Math.max(0, Math.min(1, (t - start) / ms));
      setV(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, from, delay]);
  return v;
}
