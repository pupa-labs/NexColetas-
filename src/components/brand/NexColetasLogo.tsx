import React, { useState } from 'react';

export type LogoVariant =
  | 'horizontal'
  | 'symbol'
  | 'light-bg'
  | 'dark-bg';

interface NexColetasLogoProps {
  variant?: LogoVariant;
  tone?: 'auto' | 'light-bg' | 'dark-bg';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  taglineText?: string;
  className?: string;
}

export const OFFICIAL_LOGO_ASSET_PATHS: Record<LogoVariant, string> = {
  horizontal: '/assets/brand/logo-horizontal.png',
  symbol: '/assets/brand/logo-symbol.png',
  'light-bg': '/assets/brand/logo-light-bg.png',
  'dark-bg': '/assets/brand/logo-dark-bg.png',
};

export const NexColetasLogo: React.FC<NexColetasLogoProps> = ({
  variant = 'horizontal',
  tone = 'auto',
  size = 'md',
  showTagline = true,
  taglineText = 'Sua coleta. Nossa conexão.',
  className = '',
}) => {
  const [customAssetLoaded, setCustomAssetLoaded] = useState(false);

  const isLightSurface =
    variant === 'light-bg' || tone === 'light-bg';

  const dimensions = {
    sm: { icon: 32, title: 'text-base', sub: 'text-[8.5px]' },
    md: { icon: 38, title: 'text-lg', sub: 'text-[9.5px]' },
    lg: { icon: 46, title: 'text-2xl', sub: 'text-[10.5px]' },
  }[size];

  // Tokens do Blueprint Master NexColetas (#174D35, #5DAA70, #B8DCC0, #F5F7F4, #111111)
  const nexWordColor = isLightSurface ? '#174D35' : '#F5F7F4';
  const coletasWordColor = '#5DAA70';
  const subtitleColor = isLightSurface ? '#174D35' : '#B8DCC0';
  const cubeTopFill = isLightSurface ? '#174D35' : '#F5F7F4';
  const cubeLeftFill = isLightSurface ? '#111111' : '#B8DCC0';
  const cubeRightFill = isLightSurface ? '#174D35' : '#FFFFFF';
  const cubeTapeStroke = isLightSurface ? '#F5F7F4' : '#174D35';

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}
      aria-label="NexColetas — Sua coleta. Nossa conexão."
    >
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: dimensions.icon, height: dimensions.icon }}
      >
        <svg
          viewBox="0 0 120 108"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="nexRibbonMain"
              x1="14"
              y1="88"
              x2="86"
              y2="12"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#174D35" />
              <stop offset="55%" stopColor="#5DAA70" />
              <stop offset="100%" stopColor="#B8DCC0" />
            </linearGradient>
            <linearGradient
              id="nexRibbonFold"
              x1="28"
              y1="20"
              x2="68"
              y2="78"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#B8DCC0" />
              <stop offset="65%" stopColor="#5DAA70" />
              <stop offset="100%" stopColor="#174D35" />
            </linearGradient>
          </defs>

          <path
            d="M14 78C3 92 32 104 78 83C46 95 19 90 21 76Z"
            fill="#5DAA70"
          />

          <path
            d="M20 82L36 32C39 23 48 22 53 30L40 82H20Z"
            fill="url(#nexRibbonMain)"
          />

          <path
            d="M54 68L73 24L64 19L88 6L91 33L82 28L64 72C61 78 55 77 54 68Z"
            fill="url(#nexRibbonMain)"
          />

          <path
            d="M37 29C42 21 51 22 56 31L69 61C65 72 56 73 50 63L37 29Z"
            fill="url(#nexRibbonFold)"
          />

          <g transform="translate(72, 54)">
            <polygon points="20,0 40,10 20,20 0,10" fill={cubeTopFill} />
            <polygon points="0,10 20,20 20,43 0,33" fill={cubeLeftFill} />
            <polygon points="20,20 40,10 40,33 20,43" fill={cubeRightFill} />
            <path
              d="M10 5L30 15V25"
              stroke={cubeTapeStroke}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {variant !== 'symbol' && (
        <div className="flex flex-col justify-center leading-none">
          <div className="relative inline-flex items-baseline font-display font-extrabold italic tracking-tight">
            <span
              className={dimensions.title}
              style={{ color: nexWordColor }}
            >
              Nex
            </span>
            <span
              className={dimensions.title}
              style={{ color: coletasWordColor }}
            >
              Coletas
            </span>
            <svg
              viewBox="0 0 24 18"
              className="w-3.5 h-2.5 -ml-1.5 -mt-2.5 self-start shrink-0"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 15C4 6 12 2 22 2C19 11 12 16 2 15Z"
                fill="#5DAA70"
              />
              <path
                d="M3 14C9 10 14 7 20 3"
                stroke="#174D35"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {showTagline && (
            <span
              className={`${dimensions.sub} font-display font-semibold tracking-wider mt-1 whitespace-nowrap`}
              style={{ color: subtitleColor }}
            >
              {taglineText}
            </span>
          )}
        </div>
      )}

      {customAssetLoaded && (
        <img
          src={OFFICIAL_LOGO_ASSET_PATHS[variant]}
          alt="NexColetas"
          referrerPolicy="no-referrer"
          onLoad={() => setCustomAssetLoaded(true)}
          onError={() => setCustomAssetLoaded(false)}
          className="hidden"
        />
      )}
    </div>
  );
};
