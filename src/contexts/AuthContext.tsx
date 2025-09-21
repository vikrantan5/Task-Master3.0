import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    try {
      // Validate inputs
      if (!email || !password) {
        return { error: { message: 'Email and password are required' } as AuthError };
      }
      
      if (password.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' } as AuthError };
      }
      
      // Clean and validate username
      let finalUsername = username;
      if (finalUsername) {
        finalUsername = finalUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (finalUsername.length < 3 || finalUsername.length > 20) {
          return { error: { message: 'Username must be 3-20 characters, letters, numbers, and underscores only' } as AuthError };
        }
      }
    
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: finalUsername,
            display_name: email.split('@')[0]
          }
        }
      });
      
      return { error };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: { message: 'An unexpected error occurred during sign up' } as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        return { error: { message: 'Email and password are required' } as AuthError };
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: { message: 'An unexpected error occurred during sign in' } as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      console.error('Sign out error:', err);
      return { error: { message: 'An unexpected error occurred during sign out' } as AuthError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};