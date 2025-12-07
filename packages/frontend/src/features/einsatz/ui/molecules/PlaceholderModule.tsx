interface PlaceholderModuleProps {
  title: string;
  description: string;
}

export function PlaceholderModule({ title, description }: PlaceholderModuleProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      <h2 className="mb-4 font-medium text-gray-900 text-lg dark:text-white">{title}</h2>
      <p className="text-gray-500 text-sm dark:text-gray-400">{description}</p>
    </div>
  );
}
