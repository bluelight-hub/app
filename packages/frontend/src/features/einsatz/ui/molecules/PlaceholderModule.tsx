interface PlaceholderModuleProps {
  title: string;
  description: string;
}

export function PlaceholderModule({ title, description }: PlaceholderModuleProps) {
  return (
    <div className="rounded-lg bg-surface-panel p-6 shadow">
      <h2 className="mb-4 text-lg font-medium text-text-primary">{title}</h2>
      <p className="text-body-sm text-text-secondary">{description}</p>
    </div>
  );
}
