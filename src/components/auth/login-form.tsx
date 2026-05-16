
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordStrength } from './password-strength';

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: AuthFormValues) => {
    setIsLoading(true);
    setErrorState(false);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: "Welcome back", description: "Successfully authenticated." });
      } else {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: "Account created", description: "Welcome to Vantage Vault." });
      }
    } catch (error: any) {
      setErrorState(true);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: error.message || "Invalid credentials. Please try again.",
      });
      setTimeout(() => setErrorState(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = watch('email');
    if (!email || errors.email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to reset password.",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset Link Sent",
        description: "Check your inbox for password recovery instructions.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Recovery Failed",
        description: error.message,
      });
    }
  };

  return (
    <div className={cn(
      "w-full max-w-md glass p-8 rounded-2xl shadow-2xl auth-card-transition",
      errorState && "shake-error"
    )}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-primary/10 border border-primary/20">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-headline font-bold text-white mb-2">
          Vantage Vault
        </h1>
        <p className="text-muted-foreground">
          {isLogin ? "Secure access to your identity bridge" : "Establish your secure perimeter"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className={cn(
                "pl-10 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all",
                errors.email && "border-destructive/50"
              )}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive animate-in fade-in slide-in-from-left-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {isLogin && (
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Forgot?
              </button>
            )}
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={cn(
                "pl-10 pr-10 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all",
                errors.password && "border-destructive/50"
              )}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive animate-in fade-in slide-in-from-left-1">{errors.password.message}</p>
          )}
        </div>

        {!isLogin && <PasswordStrength password={passwordValue} />}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl group relative overflow-hidden"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <span className="flex items-center justify-center gap-2">
              {isLogin ? "Authenticate" : "Create Account"}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10 text-center">
        <p className="text-sm text-muted-foreground">
          {isLogin ? "New to the perimeter?" : "Already have access?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? "Request Access" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
