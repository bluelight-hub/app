'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';
import { PiCopySimple, PiCheck } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface CopyButtonProps {
  text: string;
  className?: string;
  statusClassName?: string;
  statusTestId?: string;
  size?: 'sm' | 'md' | 'lg';
  idleLabel?: string;
  copiedLabel?: string;
  errorLabel?: string;
  feedbackDurationMs?: number;
  copyText?: (text: string) => Promise<void>;
}

type CopyState = 'idle' | 'copied' | 'error';

/**
 * Copy-to-Clipboard Button
 *
 * Kopiert Text in die Zwischenablage und zeigt visuelles Feedback.
 * Nutzt moderne Clipboard API ohne deprecated execCommand.
 */
export function CopyButton({
  text,
  className,
  statusClassName,
  statusTestId,
  size = 'md',
  idleLabel = 'Kopieren',
  copiedLabel = 'Kopiert!',
  errorLabel = 'Kopieren fehlgeschlagen',
  feedbackDurationMs = 2000,
  copyText,
}: CopyButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const handleCopy = useCallback(async () => {
    try {
      const writeText = copyText ?? navigator.clipboard?.writeText?.bind(navigator.clipboard);
      if (!writeText) {
        setCopyState('error');
        return;
      }
      await writeText(text);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }, [copyText, text]);

  // Cleanup timeout to prevent memory leak
  useEffect(() => {
    if (copyState !== 'idle') {
      const timeoutId = setTimeout(() => setCopyState('idle'), feedbackDurationMs);
      return () => clearTimeout(timeoutId);
    }
  }, [copyState, feedbackDurationMs]);

  const copied = copyState === 'copied';
  const label = copied ? copiedLabel : idleLabel;
  const statusText = copyState === 'copied' ? copiedLabel : copyState === 'error' ? errorLabel : null;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button type="button" intent={copied ? 'success' : 'secondary'} appearance="outline" size={size} onClick={handleCopy} className={cn('gap-2', className)}>
        {copied ? (
          <>
            <PiCheck className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </>
        ) : (
          <>
            <PiCopySimple className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </Button>
      {statusText ? (
        <span role="status" aria-live="polite" className={cn('text-xs text-text-muted', copyState === 'error' && 'text-status-danger-text', statusClassName)} data-testid={statusTestId}>
          {statusText}
        </span>
      ) : null}
    </span>
  );
}
