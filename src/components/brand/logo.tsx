import Image from 'next/image';

type LogoBackground = 'light' | 'dark';

interface LogoProps {
  background?: LogoBackground;
  className?: string;
  priority?: boolean;
}

const ALT_TEXT = 'LEJ Capital Management';

export function LogoIcon({ background = 'light', className = 'h-10 w-10', priority = false }: LogoProps) {
  const src = background === 'dark' ? '/brand/lej-icon-dark.png' : '/brand/lej-icon-light.png';

  return (
    <Image
      src={src}
      alt={ALT_TEXT}
      width={260}
      height={260}
      className={`shrink-0 object-contain ${className}`}
      priority={priority}
      sizes="(max-width: 768px) 40px, 56px"
    />
  );
}

export function LogoFull({ background = 'light', className = 'h-12 w-auto', priority = false }: LogoProps) {
  const src = background === 'dark' ? '/brand/lej-full-dark.png' : '/brand/lej-full-light.png';

  return (
    <Image
      src={src}
      alt={ALT_TEXT}
      width={625}
      height={126}
      className={`shrink-0 object-contain ${className}`}
      priority={priority}
      sizes="(max-width: 768px) 180px, 280px"
    />
  );
}

export function BrandMark({
  background = 'light',
  collapsed = false,
  className = '',
  priority = false,
}: LogoProps & { collapsed?: boolean }) {
  if (collapsed) {
    return <LogoIcon background={background} className={`h-10 w-10 ${className}`} priority={priority} />;
  }

  return <LogoFull background={background} className={`h-12 w-auto ${className}`} priority={priority} />;
}
