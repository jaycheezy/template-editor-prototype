export function formatTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const s = Math.floor(totalSeconds);
  const cs = Math.round((totalSeconds - s) * 100);
  return `${s}:${cs.toString().padStart(2, '0')}`;
}

export function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}

export function applyTextCase(text: string, c: 'none' | 'upper' | 'lower' | 'title'): string {
  switch (c) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    default:
      return text;
  }
}
