import { Badge } from '@/components/ui/Badge';
import { getStatusConfig, type AppointmentStatus } from '@/types/database';

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = getStatusConfig(status);
  return (
    <Badge className={`${config.bg} ${config.text}`} dot dotColor={config.dot}>
      {config.label}
    </Badge>
  );
}
