// Event join PINs are 6 digits (assigned by the database). Shown Kahoot-style as "482 913".

export const PIN_LENGTH = 6;

/** "482913" -> "482 913" (anything that isn't a 6-digit PIN is returned unchanged). */
export function formatPin(code: string): string {
  return /^\d{6}$/.test(code) ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** Keeps only digits, up to the PIN length (handles pasted "482 913" or "#482-913"). */
export function cleanPinInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, PIN_LENGTH);
}
