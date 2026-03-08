/**
 * Hebt Suchergebnisse im Text hervor, indem Treffer in <mark> Tags gewrapped werden.
 */
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const normalizedQuery = query.toLowerCase();
  let currentOffset = 0;

  return (
    <>
      {parts.map((part) => {
        const startOffset = currentOffset;
        currentOffset += part.length;

        if (!part) {
          return null;
        }

        return part.toLowerCase() === normalizedQuery ? (
          <mark key={`${startOffset}-${part}`} className="rounded-sm bg-yellow-100 px-0.5 dark:bg-yellow-800/40">
            {part}
          </mark>
        ) : (
          <span key={`${startOffset}-${part}`}>{part}</span>
        );
      })}
    </>
  );
}
