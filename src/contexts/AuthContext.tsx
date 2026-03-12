import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseDiagnostics, supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: SupabaseUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; errorMessage?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to initialize auth session.', error);
      }

      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Sign-in failed.', {
          authError: {
            message: error.message,
            status: error.status,
            code: error.code,
            name: error.name,
          },
          attemptedEmail: email,
          env: getSupabaseDiagnostics(),
        });
      } else {
        console.error('Sign-in failed.');
      }

      return { success: false, errorMessage: error.message };
    }

    if (!data.session && import.meta.env.DEV) {
      console.warn('Sign-in succeeded but no session returned.', {
        attemptedEmail: email,
        userId: data.user?.id ?? null,
        env: getSupabaseDiagnostics(),
      });
    }

    setUser(data.user ?? null);
    return { success: !!data.user };
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out failed.', error);
      return;
    }

    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
