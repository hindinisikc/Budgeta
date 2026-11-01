/** Thrown for invalid user input; `message` is safe to show in the UI. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
