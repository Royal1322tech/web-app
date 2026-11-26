/** A country's emoji flag from its ISO 3166-1 alpha-2 code (regional indicator letters); "" otherwise. */
export const flagEmoji = (code: string) => (/^[A-Z]{2}$/i.test(code) ? String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1a5 + letter.charCodeAt(0))) : "");
