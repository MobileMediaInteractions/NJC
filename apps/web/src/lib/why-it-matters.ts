export const WHY_IT_MATTERS_MAX_CHARACTERS = 160;
export const WHY_IT_MATTERS_MIN_TARGET_CHARACTERS = 80;

const impactLanguage = /\b(affect|because|cost|impact|means|matter|resident|community|family|families|tax|school|safety|service|housing|traffic|health|job|business|vote|public)\b/i;

interface WhyItMattersSource {
  headline: string;
  dek: string;
  body: string[];
}

interface Candidate {
  text: string;
  sourceIndex: number;
  sentenceIndex: number;
  score: number;
}

/**
 * Builds a factual, extractive callout from copy already written by the
 * newsroom. No new claims are invented and the result always fits the public
 * story card.
 */
export function generateWhyItMatters({ headline, dek, body }: WhyItMattersSource) {
  const normalizedHeadline = normalizeForComparison(headline);
  const candidates = [dek, ...body.slice(0, 5)]
    .flatMap((source, sourceIndex) =>
      splitSentences(source).map((text, sentenceIndex): Candidate => ({
        text,
        sourceIndex,
        sentenceIndex,
        score:
          (sourceIndex === 0 ? 8 : Math.max(1, 6 - sourceIndex)) +
          (impactLanguage.test(text) ? 5 : 0) +
          (text.length >= WHY_IT_MATTERS_MIN_TARGET_CHARACTERS && text.length <= WHY_IT_MATTERS_MAX_CHARACTERS ? 3 : 0),
      })),
    )
    .filter((candidate) => normalizeForComparison(candidate.text) !== normalizedHeadline)
    .filter((candidate, index, all) =>
      all.findIndex((item) => normalizeForComparison(item.text) === normalizeForComparison(candidate.text)) === index,
    );

  if (!candidates.length) return "";

  const ranked = [...candidates].sort((left, right) =>
    right.score - left.score || left.sourceIndex - right.sourceIndex || left.sentenceIndex - right.sentenceIndex,
  );
  let result = ranked[0]?.text ?? "";

  if (result.length < WHY_IT_MATTERS_MIN_TARGET_CHARACTERS) {
    const continuation = candidates.find((candidate) =>
      candidate.text !== result && `${result} ${candidate.text}`.length <= WHY_IT_MATTERS_MAX_CHARACTERS,
    );
    if (continuation) result = `${result} ${continuation.text}`;
  }

  return fitCallout(result, WHY_IT_MATTERS_MAX_CHARACTERS);
}

function splitSentences(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 10);
}

function fitCallout(value: string, maximum: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;

  const visible = normalized.slice(0, maximum - 1);
  const sentenceEnd = Math.max(visible.lastIndexOf("."), visible.lastIndexOf("!"), visible.lastIndexOf("?"));
  if (sentenceEnd >= WHY_IT_MATTERS_MIN_TARGET_CHARACTERS - 1) {
    return visible.slice(0, sentenceEnd + 1);
  }

  const wordEnd = visible.lastIndexOf(" ");
  return `${visible.slice(0, Math.max(0, wordEnd)).replace(/[,:;\s]+$/, "")}…`;
}

function normalizeForComparison(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
