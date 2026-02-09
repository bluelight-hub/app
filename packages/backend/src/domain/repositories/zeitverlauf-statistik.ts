export interface ZeitverlaufBucket {
  /** Anfang des Zeitintervalls (ISO timestamp) */
  timestamp: Date;
  /** Anzahl in diesem Intervall erstellter Erinnerungen */
  erstellt: number;
  /** Anzahl in diesem Intervall ausgelöster Alarme */
  ausgeloest: number;
  /** Anzahl in diesem Intervall eskalierter Erinnerungen */
  eskaliert: number;
}

export interface ZeitverlaufStatistik {
  /** Intervallbreite in Minuten */
  intervalMinutes: number;
  /** Zeitreihen-Daten, aufsteigend nach timestamp sortiert */
  buckets: ZeitverlaufBucket[];
}
