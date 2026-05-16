
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrength } from './password-strength';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function LoginForm() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      router.push('/selection');
    }
  }, [user, router]);

  if (!auth) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>System Error</AlertTitle>
        <AlertDescription>
          Firebase is not correctly configured. Please connect your project in the Firebase Studio console to enable authentication.
        </AlertDescription>
      </Alert>
    );
  }

  const handleSSOLogin = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: "Welcome back!", description: "Successfully signed in with SSO." });
    } catch (error: any) {
      console.error("SSO Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: error.message || "Failed to sign in with SSO." 
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticating || !email || !password) return;
    
    setIsAuthenticating(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Account Created", description: "Your account has been successfully registered." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome back!", description: "Successfully signed in." });
      }
    } catch (error: any) {
      console.error("Email Auth Error:", error);
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: error.message || "Please check your credentials and try again." 
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2 text-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Sign In</h2>
        <p className="text-sm text-gray-500 font-medium">Access your ANFLOCOR Enterprise Portal</p>
      </div>

      <Tabs defaultValue="sso" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="sso">Enterprise SSO</TabsTrigger>
          <TabsTrigger value="email">Email Access</TabsTrigger>
        </TabsList>

        <TabsContent value="sso" className="space-y-4">
          <Button
            onClick={handleSSOLogin}
            disabled={isAuthenticating}
            className="w-full bg-anflocor-green hover:bg-anflocor-green/90 text-white h-12 rounded-md font-semibold text-base shadow-sm transition-all"
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
          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Secured by Microsoft Azure AD / Google Workspace
          </p>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@anflocor.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              {isSignUp && <PasswordStrength password={password} />}
            </div>

            <Button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-anflocor-green hover:bg-anflocor-green/90 text-white h-12 rounded-md font-semibold text-base"
            >
              {isAuthenticating ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center">
              <Button 
                variant="link" 
                type="button"
                className="text-xs font-bold text-anflocor-green"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already have an account? Sign In" : "Need access? Request Account / Sign Up"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
      
      <div className="flex items-center justify-center space-x-2 text-gray-400 opacity-50">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Enterprise Identity Management v2.5</span>
      </div>
    </div>
  );
}
