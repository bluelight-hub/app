import { createFileRoute } from '@tanstack/react-router';
import { AdminFuehrungsrhythmusTemplatePage } from '@/features/templates/ui/pages/AdminFuehrungsrhythmusTemplatePage';

export const Route = createFileRoute('/admin/fuehrungsrhythmus-templates')({
  component: AdminFuehrungsrhythmusTemplatePage,
  meta: () => [{ title: 'Führungsrhythmus-Templates' }],
});
