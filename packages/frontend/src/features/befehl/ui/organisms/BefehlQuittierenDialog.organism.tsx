import { useState, useRef, useEffect } from 'react';
import { PiCheckCircle, PiQuestion, PiXCircle } from 'react-icons/pi';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog } from '@/shared/ui/molecules/dialog.molecule';
import { Textarea } from '@/shared/ui/atoms/textarea.atom';
import { cn } from '@/shared/ui/cn';
import { useQuittierenBefehl } from '../../api/use-quittieren-befehl';
import { QuittierenBefehlDtoQuittierungArtEnum } from '@bluelight-hub/shared/client';

type QuittierungArt = QuittierenBefehlDtoQuittierungArtEnum;

interface BefehlQuittierenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  befehlId: string;
  befehlNummer: string;
  empfaengerId: string;
  einsatzId: string;
  bereitsQuittiert?: boolean;
}

/**
 * Dialog zur Quittierung eines Befehls.
 *
 * Zeigt drei große Buttons (Verstanden, Rückfrage, Nicht verstanden)
 * mit Intent-Farben und Icons. Bei Rückfrage wird eine Textarea
 * inline eingeblendet für optionalen Kommentar.
 */
export function BefehlQuittierenDialog({ isOpen, onClose, befehlId, befehlNummer, empfaengerId, einsatzId, bereitsQuittiert = false }: BefehlQuittierenDialogProps) {
  const { mutate: quittieren, isPending } = useQuittierenBefehl(einsatzId);
  const [activeAction, setActiveAction] = useState<QuittierungArt | null>(null);
  const [showRueckfrageText, setShowRueckfrageText] = useState(false);
  const [rueckfrageText, setRueckfrageText] = useState('');
  const rueckfrageTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showRueckfrageText) {
      const timer = setTimeout(() => rueckfrageTextareaRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [showRueckfrageText]);

  const handleQuittieren = (art: QuittierungArt) => {
    if (art === QuittierenBefehlDtoQuittierungArtEnum.Rueckfrage && !showRueckfrageText) {
      setShowRueckfrageText(true);
      return;
    }

    setActiveAction(art);
    quittieren(
      { befehlId, empfaengerId, quittierungArt: art, kommentar: rueckfrageText || undefined },
      {
        onSuccess: () => {
          handleClose();
        },
        onSettled: () => setActiveAction(null),
      },
    );
  };

  const handleClose = () => {
    setShowRueckfrageText(false);
    setRueckfrageText('');
    setActiveAction(null);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <Dialog.Title>Befehl #{befehlNummer} quittieren</Dialog.Title>

      <Dialog.Body>
        {bereitsQuittiert ? (
          <div aria-live="polite">
            <p className="text-base text-gray-500 dark:text-gray-400">Dieser Befehl wurde bereits quittiert.</p>
          </div>
        ) : (
          <>
            {/* Quittierungs-Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row" aria-live="polite">
              {/* Verstanden */}
              <Button
                intent="success"
                size="lg"
                className="min-h-12 min-w-12 flex-1 md:min-h-11 md:min-w-11"
                aria-label="Befehl als verstanden quittieren"
                loading={activeAction === QuittierenBefehlDtoQuittierungArtEnum.Verstanden && isPending}
                disabled={isPending}
                onClick={() => handleQuittieren(QuittierenBefehlDtoQuittierungArtEnum.Verstanden)}
              >
                {activeAction === QuittierenBefehlDtoQuittierungArtEnum.Verstanden && isPending ? (
                  <span className="text-lg">Gesendet...</span>
                ) : (
                  <>
                    <PiCheckCircle className="mr-2 h-5 w-5" />
                    <span className="text-lg">Verstanden</span>
                  </>
                )}
              </Button>

              {/* Rückfrage */}
              <Button
                intent="warning"
                size="lg"
                className="min-h-12 min-w-12 flex-1 md:min-h-11 md:min-w-11"
                aria-label="Rückfrage zum Befehl stellen"
                loading={activeAction === QuittierenBefehlDtoQuittierungArtEnum.Rueckfrage && isPending}
                disabled={isPending}
                onClick={() => handleQuittieren(QuittierenBefehlDtoQuittierungArtEnum.Rueckfrage)}
              >
                {activeAction === QuittierenBefehlDtoQuittierungArtEnum.Rueckfrage && isPending ? (
                  <span className="text-lg">Gesendet...</span>
                ) : (
                  <>
                    <PiQuestion className="mr-2 h-5 w-5" />
                    <span className="text-lg">Rückfrage</span>
                  </>
                )}
              </Button>

              {/* Nicht verstanden */}
              <Button
                intent="danger"
                size="lg"
                className="min-h-12 min-w-12 flex-1 md:min-h-11 md:min-w-11"
                aria-label="Befehl als nicht verstanden quittieren"
                loading={activeAction === QuittierenBefehlDtoQuittierungArtEnum.NichtVerstanden && isPending}
                disabled={isPending}
                onClick={() => handleQuittieren(QuittierenBefehlDtoQuittierungArtEnum.NichtVerstanden)}
              >
                {activeAction === QuittierenBefehlDtoQuittierungArtEnum.NichtVerstanden && isPending ? (
                  <span className="text-lg">Gesendet...</span>
                ) : (
                  <>
                    <PiXCircle className="mr-2 h-5 w-5" />
                    <span className="text-lg">Nicht verstanden</span>
                  </>
                )}
              </Button>
            </div>

            {/* Rückfrage-Textarea (inline, animiert) */}
            <div className={cn('overflow-hidden motion-safe:transition-all motion-safe:duration-300', showRueckfrageText ? 'mt-4 max-h-60 opacity-100' : 'max-h-0 opacity-0')}>
              <Textarea
                ref={rueckfrageTextareaRef}
                textareaSize="sm"
                placeholder="Rückfrage-Text (optional)"
                value={rueckfrageText}
                onChange={(e) => setRueckfrageText(e.target.value)}
                aria-label="Rückfrage-Text eingeben"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  intent="warning"
                  size="sm"
                  loading={activeAction === QuittierenBefehlDtoQuittierungArtEnum.Rueckfrage && isPending}
                  disabled={isPending}
                  onClick={() => handleQuittieren(QuittierenBefehlDtoQuittierungArtEnum.Rueckfrage)}
                >
                  Rückfrage senden
                </Button>
                <Button
                  intent="secondary"
                  appearance="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    setShowRueckfrageText(false);
                    setRueckfrageText('');
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog.Body>
    </Dialog>
  );
}
