import { useEffect, useState } from 'react';

export type ProbeStatus = 'idle' | 'loading' | 'ok' | 'missing';

const cache = new Map<string, 'ok' | 'missing'>();
const DEBOUNCE_MS = 400;

/**
 * Checks whether an image URL loads, so the editor can show the resolved asset
 * or fall back (mirrors the HEAD check production does before serving a custom image).
 * Debounced so typing a URL doesn't fire a request per keystroke.
 */
export function useImageProbe(url: string | null): ProbeStatus {
  const [, bump] = useState(0);

  useEffect(() => {
    if (!url || cache.has(url)) return undefined;
    let cancelled = false;
    let img: HTMLImageElement | null = null;
    const finish = (result: 'ok' | 'missing') => {
      cache.set(url, result);
      if (!cancelled) bump((n) => n + 1);
    };
    const timer = window.setTimeout(() => {
      img = new Image();
      img.onload = () => finish('ok');
      img.onerror = () => finish('missing');
      img.src = url;
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [url]);

  if (!url) return 'idle';
  return cache.get(url) ?? 'loading';
}
