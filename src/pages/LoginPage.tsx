import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("adminadmin");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isAuthLoading } = useAuth();
  const navigate = useNavigate();

  if (!isAuthLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      navigate("/", { replace: true });
    } else {
      toast.error("Sign in failed. Check your credentials and try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />
      <div className="relative w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">NeuroQuant</h1>
          <p className="text-sm text-muted-foreground mt-1">Portfolio & Operations Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="config-panel space-y-4">
          <div>
            <label className="config-label">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>
          <div>
            <label className="config-label">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary border-border text-foreground"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Internal system — authorized access only
        </p>
      </div>
    </div>
  );
}
