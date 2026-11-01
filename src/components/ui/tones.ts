export type Tone = 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral';

/** Soft badge / pill colors per tone (Terra "fixed" containers). */
export const softTone: Record<Tone, string> = {
  primary: 'bg-primary-fixed text-on-primary-fixed',
  secondary: 'bg-secondary-fixed text-on-secondary-fixed',
  tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed',
  error: 'bg-error-container text-on-error-container',
  neutral: 'bg-surface-container text-on-surface-variant',
};

/** Foreground (icon/text) color per tone. */
export const textTone: Record<Tone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  error: 'text-error',
  neutral: 'text-on-surface-variant',
};

/** Solid fill for bars and dots. */
export const fillTone: Record<Tone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary-fixed-dim',
  tertiary: 'bg-tertiary-container',
  error: 'bg-error',
  neutral: 'bg-outline-variant',
};
