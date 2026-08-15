'use client';

import { splitHighlighted, type HighlightWord } from '@/lib/highlight-words';

type Props = {
  text: string;
  words: HighlightWord[];
  activeId: number | null;
  learnedIds: Set<number>;
  onSelect: (word: HighlightWord) => void;
};

export default function AiParagraph({
  text,
  words,
  activeId,
  learnedIds,
  onSelect,
}: Props) {
  const parts = splitHighlighted(text, words);

  return (
    <p className="font-display text-[1.2rem] leading-[1.85] text-on-surface sm:text-[1.35rem]">
      {parts.map((part, i) => {
        if (part.type === 'text') {
          return <span key={i}>{part.value}</span>;
        }
        const learned = learnedIds.has(part.word.id);
        const active = activeId === part.word.id;
        return (
          <button
            key={`${part.word.id}-${i}`}
            type="button"
            onClick={() => onSelect(part.word)}
            className={`mx-0.5 inline rounded-md px-1 py-0.5 font-semibold underline decoration-2 underline-offset-4 transition ${
              learned
                ? 'bg-primary-container/25 text-primary decoration-primary/40'
                : active
                  ? 'bg-secondary-container text-on-secondary-container decoration-secondary'
                  : 'bg-tertiary/10 text-tertiary decoration-tertiary/50 hover:bg-tertiary/20'
            }`}
          >
            {part.value}
          </button>
        );
      })}
    </p>
  );
}
