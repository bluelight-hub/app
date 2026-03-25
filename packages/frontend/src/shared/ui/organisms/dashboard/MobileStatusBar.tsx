interface MobileStatusBarProps {
  total: number;
  counts: {
    angelegt: number;
    inBearbeitung: number;
    abgeschlossen: number;
    archiviert: number;
  };
}

export const MobileStatusBar = ({ total, counts }: MobileStatusBarProps) => {
  return (
    <div className="mt-3 flex items-center justify-around rounded-lg bg-surface-raised p-2 sm:hidden">
      <div className="text-center">
        <p className="text-xs text-text-secondary">Gesamt</p>
        <p className="text-lg font-bold text-text-primary">{total}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-status-info-text">Angelegt</p>
        <p className="text-lg font-bold text-status-info-text">{counts.angelegt}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-status-warning-text">In Bearbeitung</p>
        <p className="text-lg font-bold text-status-warning-text">{counts.inBearbeitung}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-status-success-text">Abgeschlossen</p>
        <p className="text-lg font-bold text-status-success-text">{counts.abgeschlossen}</p>
      </div>
    </div>
  );
};
