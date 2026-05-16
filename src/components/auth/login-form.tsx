"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  const handleSSOLogin = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    // Simulate a brief authentication delay
    setTimeout(() => {
      setIsAuthenticating(false);
      router.push('/selection');
    }, 800);
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={handleSSOLogin}
        disabled={isAuthenticating}
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
