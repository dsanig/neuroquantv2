import { cn } from "@/lib/utils";

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'processing';

const statusMap: Record<string, StatusType> = {
  completed: 'success',
  connected: 'success',
  active: 'success',
  failed: 'error',
  error: 'error',
  processing: 'info',
  pending: 'neutral',
  partial: 'warning',
  unknown: 'neutral',
  inactive: 'neutral',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const type = statusMap[status.toLowerCase()] || 'neutral';
  return (
    <span className={cn(
      "status-badge",
      type === 'success' && 'status-success',
      type === 'error' && 'status-error',
      type === 'warning' && 'status-warning',
      type === 'info' && 'status-info',
      type === 'neutral' && 'status-neutral',
      type === 'processing' && 'status-info',
      className,
    )}>
      {type === 'processing' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse-glow inline-block" />}
      {status}
    </span>
  );
}
