import React from 'react';

interface LeadRadarLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  theme?: 'light' | 'dark';
  className?: string;
  size?: number;
}

export const LeadRadarLogo: React.FC<LeadRadarLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  size = 1,
}) => {
  const isDark = theme === 'dark';

  const dotColor = isDark ? '#5EEAD4' : '#14B8A6';
  const ring1Color = isDark ? '#5EEAD4' : '#14B8A6';
  const ring2Color = isDark ? '#5EEAD4' : '#14B8A6';
  const leadColor = isDark ? '#99F6E4' : '#0F2B2E';
  const radarColor = '#14B8A6';

  const PulseIcon = ({ s = 44 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="5" fill={dotColor} />
      <circle cx="24" cy="24" r="12" stroke={ring1Color} strokeWidth="2.5" fill="none" opacity="0.7" />
      <circle cx="24" cy="24" r="20" stroke={ring2Color} strokeWidth="2" fill="none" opacity="0.35" />
    </svg>
  );

  if (variant === 'icon') {
    return <PulseIcon s={40 * size} />;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`} style={{ transform: `scale(${size})`, transformOrigin: 'left center' }}>
        <PulseIcon s={32} />
        <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <span style={{ color: leadColor }}>Lead</span>
          <span style={{ color: radarColor }}>Radar</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ transform: `scale(${size})`, transformOrigin: 'left center' }}>
      <PulseIcon s={44} />
      <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <span style={{ color: leadColor }}>Lead</span>
        <span style={{ color: radarColor }}>Radar</span>
      </span>
    </div>
  );
};

export default LeadRadarLogo;
