import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/cn';

export type KbdPlatform = 'apple' | 'nonApple';
export type KbdTone = 'default' | 'inverse' | 'subtle';
export type KbdSize = 'sm' | 'md';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  readonly keys: string | ReadonlyArray<string>;
  readonly platform?: KbdPlatform;
  readonly tone?: KbdTone;
  readonly size?: KbdSize;
}

const KEY_LABELS: Record<string, string> = {
  control: 'Ctrl',
  ctrl: 'Ctrl',
  shift: '⇧',
  alt: 'Alt',
  option: 'Alt',
  enter: 'Enter',
  return: 'Enter',
  escape: 'Esc',
  esc: 'Esc',
  space: 'Space',
  slash: '/',
  '/': '/',
  arrowup: '↑',
  up: '↑',
  arrowdown: '↓',
  down: '↓',
  arrowleft: '←',
  left: '←',
  arrowright: '→',
  right: '→',
};

function detectKbdPlatform(): KbdPlatform {
  if (typeof navigator === 'undefined') {
    return 'nonApple';
  }

  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  return /mac|iphone|ipad|ipod/.test(platform) || /mac|iphone|ipad|ipod/.test(userAgent) ? 'apple' : 'nonApple';
}

export function formatShortcutKey(key: string, platform: KbdPlatform = detectKbdPlatform()): string {
  const normalized = key.trim().toLowerCase();
  if (normalized === 'mod' || normalized === 'cmd' || normalized === 'meta') {
    return platform === 'apple' ? '⌘' : 'Ctrl';
  }
  if ((normalized === 'alt' || normalized === 'option') && platform === 'apple') {
    return '⌥';
  }
  return KEY_LABELS[normalized] ?? key.trim().charAt(0).toUpperCase() + key.trim().slice(1).toLowerCase();
}

function normalizeKeys(keys: string | ReadonlyArray<string>): ReadonlyArray<string> {
  if (Array.isArray(keys)) {
    return keys;
  }
  return keys.split('+').map((key) => key.trim());
}

const TONE_CLASSES: Record<KbdTone, string> = {
  default: 'border-border-strong bg-surface-raised text-text-primary shadow-sm',
  inverse: 'border-surface-inverse/20 bg-surface-inverse/16 text-text-inverse',
  subtle: 'border-border-subtle bg-action-secondary text-text-secondary',
};

const SIZE_CLASSES: Record<KbdSize, string> = {
  sm: 'min-h-5 px-1 py-0 text-[0.625rem]',
  md: 'min-h-6 px-1.5 py-0.5 text-xs',
};

export function Kbd({ keys, platform = detectKbdPlatform(), tone = 'default', size = 'md', className, ...props }: KbdProps) {
  const normalizedKeys = normalizeKeys(keys);
  const displayKeys = normalizedKeys.map((key) => formatShortcutKey(key, platform));

  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 rounded-control border font-mono leading-none font-semibold tabular-nums',
        'focus:outline-none focus-visible:shadow-focus-ring',
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {displayKeys.map((key, index) => (
        <span key={normalizedKeys.slice(0, index + 1).join('+')}>{key}</span>
      ))}
    </kbd>
  );
}
