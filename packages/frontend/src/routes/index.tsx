import { createFileRoute } from '@tanstack/react-router';
import { ColorModeButton } from '@/components/ui/color-mode.tsx';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <>
      <div>Hello "/"!</div>
      <ColorModeButton />
    </>
  );
}
