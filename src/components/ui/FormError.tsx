import { Icon } from './Icon';

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-error-container/70 px-3 py-2 text-sm font-semibold text-on-error-container">
      <Icon name="info" size={18} className="mt-0.5" />
      {message}
    </p>
  );
}
