// Event join PINs are 6 digits (assigned by the database and stored as plain digits).
//
// HOW PINs LOOK EVERYWHERE IN THE APP is set by the two lines below. Change only these:
//   [2, 2, 2] with '-'  ->  12-12-26   (current)
//   [3, 3]    with ' '  ->  482 913
// Every screen, the join page's typing box and the example PINs follow automatically.
export const PIN_GROUPS = [2, 2, 2];
export const PIN_SEPARATOR = '-';

export const PIN_LENGTH = PIN_GROUPS.reduce((sum, n) => sum + n, 0);

/** Splits digits into the groups above, leaving out empty groups (so typing never shows a trailing separator). */
function group(digits: string): string {
  const parts: string[] = [];
  let at = 0;
  for (const size of PIN_GROUPS) {
    const part = digits.slice(at, at + size);
    if (part) parts.push(part);
    at += size;
  }
  return parts.join(PIN_SEPARATOR);
}

/** "121226" -> "12-12-26" (anything that isn't a full PIN, like "EVENT-1", is returned unchanged). */
export function formatPin(code: string): string {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(code) ? group(code) : code;
}

/** While typing: "1" "12" "12-1" "12-12-2" ... adds each separator only once a digit follows it. */
export function formatPinTyping(value: string): string {
  return group(cleanPinInput(value));
}

/** Keeps only digits, up to the PIN length (handles pasted "12-12-26", "482 913" or "#121226"). */
export function cleanPinInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, PIN_LENGTH);
}

/** Characters the join box accepts: digits and the separator. */
export const PIN_INPUT_PATTERN = `[0-9${PIN_SEPARATOR.replace(/[-\\\]^]/g, '\\$&')}]*`;

/** Example PIN for hints and placeholders, shown in the current format. */
export const EXAMPLE_PIN = formatPin('482913'.padEnd(PIN_LENGTH, '0').slice(0, PIN_LENGTH));
