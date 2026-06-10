type IconName = 'bell' | 'close' | 'download' | 'menu' | 'present' | 'print';

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className = 'h-5 w-5' }: IconProps) {
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    stroke: 'currentColor',
    'aria-hidden': true,
  };

  switch (name) {
    case 'bell':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 0 0-12 0v.75a8.967 8.967 0 0 1-2.312 6.022 23.848 23.848 0 0 0 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      );
    case 'present':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12a2.25 2.25 0 0 0 2.25-2.25V3m-16.5 0h16.5M8.25 16.5l-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
        </svg>
      );
    case 'print':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.034V4.9A1.125 1.125 0 0 1 7.875 3.775h8.25A1.125 1.125 0 0 1 17.25 4.9v2.134m-10.5 0a48.159 48.159 0 0 1 10.5 0m-10.5 0a48.041 48.041 0 0 0-1.913.247A2.25 2.25 0 0 0 3 9.456v6.294A2.25 2.25 0 0 0 5.25 18H6.34m10.91 0h1.5A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18l-.229 2.523A1.125 1.125 0 0 0 7.231 21.75h9.538a1.125 1.125 0 0 0 1.12-1.227L17.66 18M6.34 18h11.32" />
        </svg>
      );
  }
}
