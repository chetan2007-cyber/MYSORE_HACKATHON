/**
 * Deterministic MVP Content Moderation Engine
 * 
 * Inspects user-submitted report titles and descriptions for abusive language,
 * profanity, or harassment with evasion normalization (leetspeak, separators).
 */

const BLOCKED_TERMS = [
  // Deterministic Hackathon test phrases (safe for evaluation video demos)
  'abusive_test_word',
  'abusive_test',
  'hateful_test_term',
  'bad_input_abusive_test',
  // Common abusive, hateful, and profane terms
  'bastard',
  'idiot officer',
  'corrupt dog',
  'scumbag',
  'asshole',
  'bitch',
  'kill you',
  'bomb city hall',
  'death threat'
];

/**
 * Normalizes input text to catch obvious evasion attempts
 */
function normalizeText(text = '') {
  if (!text) return '';
  return text
    .toLowerCase()
    // Common leetspeak substitutions
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    // Strip punctuation often used to evade keyword matching
    .replace(/[._\-*+~#^]/g, '');
}

/**
 * Checks text for abusive content.
 * Returns { isClean: boolean, matchedTerm?: string }
 */
function checkAbusiveContent(text = '') {
  if (!text || typeof text !== 'string') {
    return { isClean: true };
  }

  const normalized = normalizeText(text);
  const rawLower = text.toLowerCase();

  for (const term of BLOCKED_TERMS) {
    const normalizedTerm = normalizeText(term);

    // Check direct substring match on raw text or normalized text
    if (rawLower.includes(term.toLowerCase()) || normalized.includes(normalizedTerm)) {
      return {
        isClean: false,
        matchedTerm: term
      };
    }
  }

  return { isClean: true };
}

module.exports = {
  checkAbusiveContent,
  normalizeText,
  BLOCKED_TERMS
};
