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
    <div className="mt-3 flex items-center justify-around rounded-lg bg-gray-50 p-2 sm:hidden dark:bg-gray-700">
      <div className="text-center">
        <p className="text-gray-600 text-xs dark:text-gray-300">Gesamt</p>
        <p className="font-bold text-gray-900 text-lg dark:text-white">{total}</p>
      </div>
      <div className="text-center">
        <p className="text-blue-600 text-xs dark:text-blue-400">Angelegt</p>
        <p className="font-bold text-blue-900 text-lg dark:text-blue-300">{counts.angelegt}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-yellow-600 dark:text-yellow-400">In Bearbeitung</p>
        <p className="font-bold text-lg text-yellow-900 dark:text-yellow-300">{counts.inBearbeitung}</p>
      </div>
      <div className="text-center">
        <p className="text-green-600 text-xs dark:text-green-400">Abgeschlossen</p>
        <p className="font-bold text-green-900 text-lg dark:text-green-300">{counts.abgeschlossen}</p>
      </div>
    </div>
  );
};
