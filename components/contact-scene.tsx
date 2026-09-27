'use client';

import React, { useState, useCallback, memo } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';

interface ContactSceneProps {
  isActive?: boolean;
  onHoverStateChange?: (state: string | null) => void;
}

type ContactChannel = 'email' | 'behance' | 'linkedin';

export const ContactScene = memo(function ContactScene({
  isActive = true,
  onHoverStateChange,
}: ContactSceneProps) {
  const [activeChannel, setActiveChannel] = useState<ContactChannel | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePointerEnter = useCallback(
    (channel: ContactChannel) => {
      if (!isActive) return;
      setActiveChannel(channel);
      onHoverStateChange?.('action');
    },
    [isActive, onHoverStateChange]
  );

  const handlePointerLeave = useCallback(() => {
    setActiveChannel(null);
    onHoverStateChange?.(null);
  }, [onHoverStateChange]);

  const handleEmailClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('nikita98zh@gmail.com').then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, []);

  // Opacity helper for mutual dimming
  const getDimOpacity = (channel: ContactChannel, defaultOpacityClass: string) => {
    if (!activeChannel) return defaultOpacityClass;
    return activeChannel === channel ? 'opacity-100' : 'opacity-25';
  };

  return (
    <div
      id="contact-scene"
      className="relative w-full max-w-6xl mx-auto px-6 sm:px-10 md:px-14 flex flex-col items-center justify-center text-center select-none"
      style={{
        transform: 'translateZ(32px)',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 
        CENTRAL MONOLITH: DIRECT EMAIL
        Dominant typographic anchor in pure Manrope ExtraBold
      */}
      <div className="relative inline-flex flex-col items-center">
        {/* Subtle non-intrusive copy status feedback */}
        <div
          aria-live="polite"
          className={`h-5 mb-3 flex items-center gap-1.5 font-manrope text-xs font-semibold tracking-[0.2em] uppercase text-[var(--text-secondary)] transition-opacity duration-300 ${
            copied ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Check className="w-3.5 h-3.5 text-[var(--text)]" />
          <span>Copied to clipboard</span>
        </div>

        <a
          href="mailto:nikita98zh@gmail.com"
          onClick={handleEmailClick}
          onPointerEnter={() => handlePointerEnter('email')}
          onPointerLeave={handlePointerLeave}
          tabIndex={isActive ? 0 : -1}
          aria-label="Email Nikita Zhorov: nikita98zh@gmail.com"
          className={`font-manrope font-extrabold text-[clamp(1.85rem,5.6vw,4.85rem)] leading-none tracking-[-0.035em] text-[var(--text)] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/40 ${getDimOpacity(
            'email',
            'opacity-100'
          )}`}
          style={{
            fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
            fontWeight: 800,
          }}
        >
          nikita98zh@gmail.com
        </a>
      </div>

      {/* 
        SECONDARY CHANNELS: BEHANCE & LINKEDIN
        Evenly spaced horizontal peers in pure Manrope Bold with mutual dimming
      */}
      <nav
        aria-label="Direct professional channels"
        className="mt-10 sm:mt-14 md:mt-16 flex items-center justify-center gap-10 sm:gap-16 md:gap-20"
      >
        <a
          href="https://www.behance.net/nikozhorov"
          target="_blank"
          rel="noopener noreferrer"
          onPointerEnter={() => handlePointerEnter('behance')}
          onPointerLeave={handlePointerLeave}
          tabIndex={isActive ? 0 : -1}
          aria-label="Nikita Zhorov on Behance"
          className={`group flex items-center gap-1.5 font-manrope font-bold text-sm sm:text-base md:text-lg tracking-[0.16em] uppercase text-[var(--text)] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/40 ${getDimOpacity(
            'behance',
            'opacity-70'
          )}`}
          style={{
            fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
            fontWeight: 700,
          }}
        >
          <span>BEHANCE</span>
          <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        <a
          href="https://www.linkedin.com/in/nikitazhorov"
          target="_blank"
          rel="noopener noreferrer"
          onPointerEnter={() => handlePointerEnter('linkedin')}
          onPointerLeave={handlePointerLeave}
          tabIndex={isActive ? 0 : -1}
          aria-label="Nikita Zhorov on LinkedIn"
          className={`group flex items-center gap-1.5 font-manrope font-bold text-sm sm:text-base md:text-lg tracking-[0.16em] uppercase text-[var(--text)] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/40 ${getDimOpacity(
            'linkedin',
            'opacity-70'
          )}`}
          style={{
            fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
            fontWeight: 700,
          }}
        >
          <span>LINKEDIN</span>
          <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </nav>
    </div>
  );
});
