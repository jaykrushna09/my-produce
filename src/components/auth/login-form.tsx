
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { auth } = useAuth();
  const { user, loading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  // If user is already logged in, redirect them
  useEffect(() => {
    if (!loading && user) {
      router.push('/selection');
    }
  }, [user, loading, router]);

  const handleSSOLogin = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection for better UX in demo
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        toast({
          title: "Authenticated Successfully",
          description: `Welcome back, ${result.user.displayName || 'Employee'}.`,
        });
        // router.push is handled by the useEffect above, 
        // but we can call it here for immediate feedback
        router.push('/selection');
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: error.message || "Could not complete SSO. Please ensure your popup blocker is disabled.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={handleSSOLogin}
        disabled={isAuthenticating || loading}
        className="w-full bg-anflocor-green hover:bg-anflocor-green/90 text-white h-12 rounded-md font-medium text-base shadow-none transition-all"
      >
        {isAuthenticating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          "Sign in with SSO"
        )}
      </Button>
      
      <p className="text-center text-xs text-muted-foreground uppercase tracking-widest">
        Secured by Enterprise Identity
      </p>
    </div>
  );
}
