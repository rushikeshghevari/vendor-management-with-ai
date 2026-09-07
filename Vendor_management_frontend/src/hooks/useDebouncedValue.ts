import { useEffect, useState } from 'react';

/** Delays reflecting `value` until it's stayed still for `delayMs` — used to avoid firing a
 *  server request on every keystroke once list-screen search moved server-side. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
