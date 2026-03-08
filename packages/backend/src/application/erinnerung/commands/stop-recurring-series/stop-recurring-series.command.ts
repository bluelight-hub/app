import { Result } from '@domain/common/result';
import { ERINNERUNG_ERROR_CODES } from '@application/erinnerung';

/**
 * Props Interface für typsichere Command-Erstellung.
 */
export interface StopRecurringSeriesCommandProps {
  /** Die ID der wiederkehrenden Parent-Erinnerung (CUID2 Format) */
  erinnerungId: string;
  /** Die ID des Einsatzes (CUID2 Format) */
  einsatzId: string;
  /** Ob auch die aktuelle aktive Instanz abgebrochen werden soll (AC2) */
  cancelCurrent?: boolean;
}

/**
 * Command zum Stoppen einer wiederkehrenden Erinnerungs-Serie (Story 6.5).
 *
 * **AC1:** Serie beenden (nur zukünftige Instanzen)
 * **AC2:** Serie und aktuelle Instanz beenden (wenn cancelCurrent=true)
 *
 * @see Erinnerung.stopRecurringSeries() - Domain Methode
 * @see ErinnerungSerieGestopptEvent - Emittiertes Domain Event
 */
export class StopRecurringSeriesCommand {
  private static readonly CUID2_PATTERN = /^[a-z0-9]{24,32}$/;

  private constructor(
    public readonly erinnerungId: string,
    public readonly einsatzId: string,
    public readonly cancelCurrent: boolean,
  ) {}

  /**
   * Factory Method mit Validierung.
   */
  static create(props: StopRecurringSeriesCommandProps): Result<StopRecurringSeriesCommand> {
    if (!props.erinnerungId || props.erinnerungId.trim().length === 0) {
      return Result.fail(ERINNERUNG_ERROR_CODES.ID_REQUIRED);
    }
    if (!StopRecurringSeriesCommand.CUID2_PATTERN.test(props.erinnerungId)) {
      return Result.fail(ERINNERUNG_ERROR_CODES.ID_INVALID);
    }

    if (!props.einsatzId || props.einsatzId.trim().length === 0) {
      return Result.fail(ERINNERUNG_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    if (!StopRecurringSeriesCommand.CUID2_PATTERN.test(props.einsatzId)) {
      return Result.fail(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    return Result.ok(new StopRecurringSeriesCommand(props.erinnerungId.trim(), props.einsatzId.trim(), props.cancelCurrent ?? false));
  }
}
