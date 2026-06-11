import Image from 'next/image';

type LogoBackground = 'light' | 'dark';

interface LogoProps {
  background?: LogoBackground;
  className?: string;
  priority?: boolean;
}

const ALT_TEXT = 'LEJ Capital Management';

export function LogoIcon({ background = 'light', className = '', priority = false }: LogoProps) {
  const src = background === 'dark' ? '/brand/lej-icon-dark.png' : '/brand/lej-icon-light.png';

  return (
    <Image
      src={src}
      alt={ALT_TEXT}
      width={260}
      height={260}
      className={`shrink-0 ${className}`}
      style={{ objectFit: 'contain', aspectRatio: '1 / 1' }}
      priority={priority}
      sizes="56px"
    />
  );
}

export function LogoFull({ background = 'light', className = '', priority = false }: LogoProps) {
  const src = background === 'dark' ? '/brand/lej-full-dark.png' : '/brand/lej-full-light.png';

  return (
    <Image
      src={src}
      alt={ALT_TEXT}
      width={625}
      height={126}
      className={`shrink-0 ${className}`}
      style={{ objectFit: 'contain', width: 'auto' }}
      priority={priority}
      sizes="280px"
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
    return <LogoIcon background={background} className={className} priority={priority} />;
  }

  return <LogoFull background={background} className={className} priority={priority} />;
}
