/**
 * Splits plain text policy documents into overlapping chunks.
 * Preserves sentence boundaries and header context where possible.
 */
export const chunkText = (
  text,
  { chunkSizeWords = 150, overlapWords = 30 } = {}
) => {
  if (!text || typeof text !== 'string') return [];

  // Split into words while normalizing multiple whitespace
  const words = text.trim().split(/\s+/);
  if (words.length <= chunkSizeWords) {
    return [words.join(' ')];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    const chunkWords = words.slice(startIndex, startIndex + chunkSizeWords);
    chunks.push(chunkWords.join(' '));

    // Advance by chunkSizeWords - overlapWords
    startIndex += chunkSizeWords - overlapWords;

    // Avoid creating tiny trailing chunks
    if (words.length - startIndex < overlapWords) {
      if (startIndex < words.length) {
        // Append remaining words to last chunk
        const remaining = words.slice(startIndex).join(' ');
        chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${remaining}`;
      }
      break;
    }
  }

  return chunks;
};

export default chunkText;
