import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="section-title">Settings</h1>
      </div>

      <div className="space-y-6">
        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-4">User Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="config-label">Display Name</label><Input defaultValue="Admin" className="bg-secondary border-border" /></div>
            <div><label className="config-label">Email</label><Input defaultValue="admin@admin.com" className="bg-secondary border-border" /></div>
            <div><label className="config-label">Timezone</label><Input defaultValue="America/New_York" className="bg-secondary border-border" /></div>
            <div><label className="config-label">Date Format</label><Input defaultValue="YYYY-MM-DD" className="bg-secondary border-border" /></div>
          </div>
        </div>

        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-4">Application Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div><div className="text-sm text-foreground">Auto-refresh Dashboard</div><div className="text-xs text-muted-foreground">Refresh dashboard data every 60 seconds</div></div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div><div className="text-sm text-foreground">Import Notifications</div><div className="text-xs text-muted-foreground">Show alerts for import failures</div></div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div><div className="text-sm text-foreground">Audit Logging</div><div className="text-xs text-muted-foreground">Log all user actions</div></div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-4">Environment</h2>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="text-foreground">NeuroQuant v0.1.0-alpha</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span className="text-foreground">development</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Build</span><span className="text-foreground">2026.03.11-001</span></div>
          </div>
        </div>

        <div className="config-panel">
          <h2 className="text-foreground font-semibold mb-4">Security</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="config-label">Session Timeout (minutes)</label><Input type="number" defaultValue="60" className="bg-secondary border-border" /></div>
            <div><label className="config-label">Max Login Attempts</label><Input type="number" defaultValue="5" className="bg-secondary border-border" /></div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm">Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
