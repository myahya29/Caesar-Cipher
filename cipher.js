/**
 * cipher.js
 * Pure Caesar Cipher logic and modular arithmetic for Information Security.
 * Alphabet: A=0, B=1, ..., Z=25 (Z_26)
 * No DOM code in this file.
 */

const ALPHABET_SIZE = 26;
const ASCII_A = 65; // 'A'.charCodeAt(0)
const ASCII_Z = 90; // 'Z'.charCodeAt(0)

/**
 * Validates the input message.
 * Strict policy: must be non-empty, uppercase A-Z only.
 * Rejects lowercase letters, spaces, digits, and punctuation.
 * Names special characters clearly in the error message.
 * @param {string} text - The raw input text
 * @returns {{ valid: boolean, error?: string }}
 */
function validateMessage(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { valid: false, error: 'Message cannot be empty. Use uppercase A to Z only.' };
  }

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < ASCII_A || code > ASCII_Z) {
      const char = text[i];
      let name;
      if (char === ' ') name = 'space';
      else if (char === '\n' || char === '\r') name = 'new line';
      else if (char === '\t') name = 'tab';
      else name = `"${char}"`;

      return {
        valid: false,
        error: `Invalid character ${name} at position ${i + 1}. Use uppercase A to Z only.`
      };
    }
  }

  return { valid: true };
}

/**
 * Validates the shift key k.
 * Strict policy: integer between 0 and 25 inclusive.
 * For strings, accepts only exact integer pattern /^-?\d+$/ (no '+', '1e1', ' 3 ', decimals).
 * Never clamps, rounds, or silently alters the value.
 * @param {any} k - The raw key input
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
function validateKey(k) {
  if (k === '' || k === null || k === undefined) {
    return { valid: false, error: 'Key cannot be empty.' };
  }

  let num;
  if (typeof k === 'number') {
    if (!Number.isInteger(k)) {
      return { valid: false, error: 'Key must be a whole number.' };
    }
    num = k;
  } else if (typeof k === 'string') {
    // If it contains a decimal point, reject as whole number error
    if (k.includes('.')) {
      const parsed = Number(k);
      if (!isNaN(parsed)) {
        return { valid: false, error: 'Key must be a whole number.' };
      }
    }
    // Accept strictly /^-?\d+$/
    if (!/^-?\d+$/.test(k)) {
      return { valid: false, error: 'Key is not a number.' };
    }
    num = Number(k);
  } else {
    return { valid: false, error: 'Key is not a number.' };
  }

  if (num < 0 || num > 25) {
    return { valid: false, error: 'Key must be between 0 and 25.' };
  }

  return { valid: true, value: num };
}

/**
 * Caesar Cipher Encryption: C[i] = (P[i] + k) mod 26
 * Throws an Error if plaintext or key is invalid.
 * @param {string} plaintext - Uppercase A-Z message
 * @param {number} k - Integer shift key in [0, 25]
 * @returns {string} Ciphertext
 */
function encrypt(plaintext, k) {
  const msgCheck = validateMessage(plaintext);
  if (!msgCheck.valid) {
    throw new Error(msgCheck.error);
  }

  const keyCheck = validateKey(k);
  if (!keyCheck.valid) {
    throw new Error(keyCheck.error);
  }

  const shift = keyCheck.value;
  let result = '';

  for (let i = 0; i < plaintext.length; i++) {
    const p = plaintext.charCodeAt(i) - ASCII_A; // Zero-indexed position 0..25
    const c = (p + shift) % ALPHABET_SIZE;         // Modular addition
    result += String.fromCharCode(c + ASCII_A);
  }

  return result;
}

/**
 * Caesar Cipher Decryption: P[i] = (C[i] - k + 26) mod 26
 * Throws an Error if ciphertext or key is invalid.
 *
 * WHY "+ 26" IS NEEDED BEFORE THE MODULO:
 * In JavaScript (and C/Java), the % operator calculates the remainder of division,
 * not the Euclidean modulo. When (C[i] - k) is negative (e.g. A=0 with k=3 gives 0 - 3 = -3),
 * JavaScript computes -3 % 26 as -3, which is an invalid array index.
 * In modular arithmetic, -3 is congruent to 23 modulo 26.
 * Adding 26 before the modulo guarantees the dividend is always non-negative:
 * Since -25 <= (C[i] - k) <= 25, adding 26 gives 1 <= (C[i] - k + 26) <= 51.
 * Thus ((C[i] - k + 26) % 26) always returns the correct letter index in 0..25.
 *
 * @param {string} ciphertext - Uppercase A-Z message
 * @param {number} k - Integer shift key in [0, 25]
 * @returns {string} Plaintext
 */
function decrypt(ciphertext, k) {
  const msgCheck = validateMessage(ciphertext);
  if (!msgCheck.valid) {
    throw new Error(msgCheck.error);
  }

  const keyCheck = validateKey(k);
  if (!keyCheck.valid) {
    throw new Error(keyCheck.error);
  }

  const shift = keyCheck.value;
  let result = '';

  for (let i = 0; i < ciphertext.length; i++) {
    const c = ciphertext.charCodeAt(i) - ASCII_A;
    // Adding 26 prevents negative remainders from JavaScript's % operator
    const p = (c - shift + ALPHABET_SIZE) % ALPHABET_SIZE;
    result += String.fromCharCode(p + ASCII_A);
  }

  return result;
}

/**
 * Builds step-by-step arithmetic data for each letter in the input message.
 * @param {string} text - Validated uppercase message
 * @param {number} k - Validated key in [0, 25]
 * @param {'encrypt'|'decrypt'} mode - Direction of operation
 * @returns {Array<object>} Arithmetic details per letter
 */
function buildSteps(text, k, mode) {
  const steps = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const pos = char.charCodeAt(0) - ASCII_A;

    if (mode === 'encrypt') {
      const raw = pos + k;
      const resPos = raw % ALPHABET_SIZE;
      const outChar = String.fromCharCode(resPos + ASCII_A);
      steps.push({
        index: i + 1,
        inChar: char,
        inPos: pos,
        k: k,
        formula: `(${pos} + ${k}) mod 26`,
        calcText: `${raw} mod 26 = ${resPos}`,
        isNegative: false,
        resPos: resPos,
        outChar: outChar
      });
    } else {
      const raw = pos - k;
      const isNegative = raw < 0;
      const adjusted = raw + ALPHABET_SIZE;
      const resPos = adjusted % ALPHABET_SIZE;
      const outChar = String.fromCharCode(resPos + ASCII_A);
      steps.push({
        index: i + 1,
        inChar: char,
        inPos: pos,
        k: k,
        formula: `(${pos} - ${k} + 26) mod 26`,
        rawDiff: raw,
        isNegative: isNegative,
        calcText: isNegative
          ? `${raw} < 0 → ${raw} + 26 = ${adjusted} mod 26 = ${resPos}`
          : `${adjusted} mod 26 = ${resPos}`,
        resPos: resPos,
        outChar: outChar
      });
    }
  }

  return steps;
}
