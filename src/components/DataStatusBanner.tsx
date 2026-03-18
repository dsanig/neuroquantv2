import { AlertCircle, Database, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getActiveConnectionId } from "@/hooks/use-analytics";

interface DataStatusBannerProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  moduleName: string;
  requiredTables?: string[];
}

export function DataStatusBanner({ isLoading, isError, error, isEmpty, moduleName, requiredTables }: DataStatusBannerProps) {
  const connId = getActiveConnectionId();

  if (!connId) {
    return (
      <div className="metric-card flex items-center gap-3 py-8 justify-center">
        <Database className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <div className="text-sm text-foreground font-medium mb-1">No data connection configured</div>
          <div className="text-xs text-muted-foreground mb-3">
            Connect to your NeuroQuant PostgreSQL database to load {moduleName} data.
          </div>
          <Link
            to="/sources"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Database className="h-3 w-3" /> Configure Data Connection
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="metric-card flex items-center gap-3 py-8 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading {moduleName} data...</span>
      </div>
    );
  }

  if (isError) {
    const msg = error?.message || 'Unknown error';
    const isTableMissing = msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('relation');
    return (
      <div className="metric-card border-destructive/30 bg-destructive/5 py-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-foreground font-medium mb-1">
              {isTableMissing ? `Missing source tables for ${moduleName}` : `Failed to load ${moduleName}`}
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-2">{msg}</div>
            {requiredTables && isTableMissing && (
              <div className="text-xs text-muted-foreground">
                Required tables: {requiredTables.map(t => (
                  <span key={t} className="status-badge status-neutral mr-1">{t}</span>
                ))}
              </div>
            )}
            <Link
              to="/sources"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
            >
              Check Data Connection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="metric-card flex items-center gap-3 py-8 justify-center">
        <Database className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <div className="text-sm text-foreground font-medium mb-1">No {moduleName} data available</div>
          <div className="text-xs text-muted-foreground">
            The connected database returned no rows. Verify the table mapping and data.
          </div>
        </div>
      </div>
    );
  }

  return null;
}
