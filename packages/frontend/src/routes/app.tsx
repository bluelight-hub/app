import { AppGuard } from '@/guards/app.guard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app')({
  component: AppGuard,
});
