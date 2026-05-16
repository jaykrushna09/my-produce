"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSSOLogin = async () => {
    setIsLoading(true);
    try {
      // For MVP/Demo purposes, we use Google as the "SSO" provider
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Authenticated",
        description: "Welcome to ANFLOCOR systems.",
      });
      // Redirect to selection screen after successful login
      router.push('/selection');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message || "Could not complete SSO authentication.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={handleSSOLogin}
        disabled={isLoading}
        className="w-full bg-anflocor-green hover:bg-anflocor-green/90 text-white h-12 rounded-md font-medium text-base shadow-none transition-all"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
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
