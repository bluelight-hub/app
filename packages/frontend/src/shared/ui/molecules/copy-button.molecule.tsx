'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';
import { PiCopySimple, PiCheck } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Copy-to-Clipboard Button
 *
 * Kopiert Text in die Zwischenablage und zeigt visuelles Feedback.
 * Nutzt moderne Clipboard API ohne deprecated execCommand.
 */
export function CopyButton({ text, className, size = 'md' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
    }
  }, [text]);

  // Cleanup timeout to prevent memory leak
  useEffect(() => {
    if (copied) {
      const timeoutId = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [copied]);

  return (
    <Button
      type="button"
      intent={copied ? 'success' : 'secondary'}
      appearance="outline"
      size={size}
      onClick={handleCopy}
      className={cn('gap-2', className)}
      aria-label={copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
    >
      {copied ? (
        <>
          <PiCheck className="h-4 w-4" aria-hidden="true" />
          <span>Kopiert!</span>
        </>
      ) : (
        <>
          <PiCopySimple className="h-4 w-4" aria-hidden="true" />
          <span>Kopieren</span>
        </>
      )}
    </Button>
  );
}
