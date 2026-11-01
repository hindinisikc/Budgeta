import { icons, isIconName, type IconName } from './icons';
import { cx } from './cx';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cx('inline-flex shrink-0 [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-current', className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}

/** For icon names stored in data (categories, accounts): unknown names fall back to a generic icon. */
export function toIconName(name: string): IconName {
  return isIconName(name) ? name : 'category';
}
