// A character with the marks that combine onto it, and what a zero-width joiner chains on (as in family emoji).
const FIRST_GRAPHEME = /^.\p{M}*(?:\p{Join_Control}.\p{M}*)*/su;

function firstGrapheme(word: string): string {
  return FIRST_GRAPHEME.exec(word)?.[0] ?? '';
}

/**
 * The first letter of the first word and of the last word, uppercased: "Pratham Sitoula" is "PS", "Pratham" is "P".
 * Empty when the name is blank or doesn't start with a letter or digit, so the caller shows the person icon instead.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word !== '');
  const first = firstGrapheme(words[0] ?? '');

  if (!/^[\p{L}\p{N}]/u.test(first)) {
    return '';
  }

  const last = words.length > 1 ? firstGrapheme(words.at(-1) ?? '') : '';

  return (first + last).toLocaleUpperCase();
}
