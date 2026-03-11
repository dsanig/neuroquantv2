import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function MetricCard({ label, value, change, changeType = 'neutral', className }: MetricCardProps) {
  return (
    <div className={cn("metric-card", className)}>
      <div className="metric-label">{label}</div>
      <div className="metric-value mt-1">{value}</div>
      {change && (
        <div className={cn(
          "text-xs font-mono mt-1",
          changeType === 'positive' && 'text-success',
          changeType === 'negative' && 'text-destructive',
          changeType === 'neutral' && 'text-muted-foreground',
        )}>
          {change}
        </div>
      )}
    </div>
  );
}
