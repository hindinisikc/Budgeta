/** Small assertion helpers shared by the repositories. All throw ValidationError with a UI-safe message. */
import { db } from '../db';
import { isValidAmount } from '../../domain/money';
import { validateName } from '../../domain/validate';
import { ValidationError } from './errors';

export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ValidationError(message);
}

export function cleanName(name: string, label = 'Name'): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const error = validateName(trimmed, label);
  if (error) throw new ValidationError(error);
  return trimmed;
}

export function checkAmount(amount: number, label = 'Amount'): void {
  check(isValidAmount(amount), `${label} must be greater than ₱0.`);
}

export async function checkCategory(id: string | null, { required }: { required: boolean }): Promise<void> {
  if (!id) {
    check(!required, 'Pick a category.');
    return;
  }
  check(await db.categories.get(id), 'Selected category no longer exists.');
}

export async function checkAccount(id: string | null): Promise<void> {
  if (!id) return;
  check(await db.accounts.get(id), 'Selected account no longer exists.');
}

export function cleanNote(note: string, max = 200): string {
  const trimmed = note.trim();
  check(trimmed.length <= max, `Note must be ${max} characters or fewer.`);
  return trimmed;
}
