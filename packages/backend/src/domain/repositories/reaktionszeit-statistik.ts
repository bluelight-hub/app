export interface ReaktionszeitBucket {
  /** Label des Buckets (z.B. "0-30s", "30s-1m") */
  label: string;
  /** Untere Grenze in Sekunden (inclusive) */
  minSeconds: number;
  /** Obere Grenze in Sekunden (exclusive, Infinity für letzten Bucket) */
  maxSeconds: number;
  /** Anzahl Erinnerungen in diesem Bucket */
  count: number;
}

export interface ReaktionszeitStatistik {
  /** Anzahl acknowledged Erinnerungen (Basis für Berechnung) */
  totalAcknowledged: number;
  /** Durchschnittliche Reaktionszeit in Sekunden */
  avgReaktionszeitSeconds: number;
  /** Median-Reaktionszeit in Sekunden */
  medianReaktionszeitSeconds: number;
  /** Schnellste Reaktionszeit in Sekunden */
  minReaktionszeitSeconds: number;
  /** Langsamste Reaktionszeit in Sekunden */
  maxReaktionszeitSeconds: number;
  /** Histogramm-Buckets für Verteilung */
  buckets: ReaktionszeitBucket[];
}
