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
        <p className="text-text-secondary text-xs">Gesamt</p>
        <p className="font-bold text-lg text-text-primary">{total}</p>
      </div>
      <div className="text-center">
        <p className="text-status-info-text text-xs">Angelegt</p>
        <p className="font-bold text-lg text-status-info-text">{counts.angelegt}</p>
      </div>
      <div className="text-center">
        <p className="text-status-warning-text text-xs">In Bearbeitung</p>
        <p className="font-bold text-lg text-status-warning-text">{counts.inBearbeitung}</p>
      </div>
      <div className="text-center">
        <p className="text-status-success-text text-xs">Abgeschlossen</p>
        <p className="font-bold text-lg text-status-success-text">{counts.abgeschlossen}</p>
      </div>
    </div>
  );
};
