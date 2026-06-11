export type IconName =
  | 'alert-circle'
  | 'archive-box'
  | 'arrows-repeat'
  | 'banknotes'
  | 'bell'
  | 'book-open'
  | 'chart-bar'
  | 'chevron-down'
  | 'chevron-up'
  | 'clipboard'
  | 'close'
  | 'cog'
  | 'download'
  | 'file-text'
  | 'gear'
  | 'menu'
  | 'moon'
  | 'present'
  | 'print'
  | 'shield'
  | 'sort'
  | 'sparkles'
  | 'sun'
  | 'trending-up'
  | 'users';

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
    case 'alert-circle':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      );
    case 'archive-box':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v4H4zM6 11v8h12v-8M10 15h4" />
        </svg>
      );
    case 'arrows-repeat':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 2.5 21 6l-4 3.5M3 11V9a3 3 0 0 1 3-3h15M7 21.5 3 18l4-3.5M21 13v2a3 3 0 0 1-3 3H3" />
        </svg>
      );
    case 'banknotes':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10H4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 10.5h.01M17 13.5h.01M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 0 0-12 0v.75a8.967 8.967 0 0 1-2.312 6.022 23.848 23.848 0 0 0 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      );
    case 'book-open':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5c-1.7-1.1-3.6-1.6-6-1.6H4.5v13H6c2.4 0 4.3.5 6 1.6m0-13c1.7-1.1 3.6-1.6 6-1.6h1.5v13H18c-2.4 0-4.3.5-6 1.6m0-13v13" />
        </svg>
      );
    case 'chart-bar':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m16 14H4m4-4V9m4 6V6m4 9v-4" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      );
    case 'chevron-up':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m18 15-6-6-6 6" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6l1 2h3v15H5V6h3l1-2Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6M9 15h4" />
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
    case 'cog':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m18.5 13.2.1-2.4 2-1.4-2-3.5-2.4 1a8 8 0 0 0-2-1.1L12 3.5 9.8 5.8a8 8 0 0 0-2 1.1l-2.4-1-2 3.5 2 1.4.1 2.4-2 1.4 2 3.5 2.4-1a8 8 0 0 0 2 1.1l2.2 2.3 2.2-2.3a8 8 0 0 0 2-1.1l2.4 1 2-3.5-2.2-1.4Z" />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h7.25L18 7.5v12.75H7z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75V7.5H18M9.5 11h5M9.5 14h5M9.5 17h3" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 12a7.6 7.6 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-1.7-1L12.5 3h-1l-2.3 3a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 1.7 1l2.3 3h1l2.3-3a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
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
    case 'moon':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-3.5 7-10V5.5L12 3 5 5.5V11c0 6.5 7 10 7 10Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.6-4" />
        </svg>
      );
    case 'sort':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8 7 4-4 4 4M16 17l-4 4-4-4M12 3v18" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      );
    case 'trending-up':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4 16 5-5 4 4 7-8m0 0h-5m5 0v5" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4m4-7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm5.5 1.5c1.7.4 2.9 1.8 2.9 3.5M17 9a2.5 2.5 0 0 0-1.2-2.1" />
        </svg>
      );
  }
}
