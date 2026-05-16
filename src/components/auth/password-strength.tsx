
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { adaptivePasswordFeedback, AdaptivePasswordFeedbackOutput } from '@/ai/flows/adaptive-password-feedback-flow';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, ShieldAlert, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [feedback, setFeedback] = useState<AdaptivePasswordFeedbackOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const getFeedback = useCallback(async (pwd: string) => {
    if (!pwd) {
      setFeedback(null);
      return;
    }
    setLoading(true);
    try {
      const result = await adaptivePasswordFeedback({ password: pwd });
      setFeedback(result);
    } catch (error) {
      console.error("Failed to fetch password feedback", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (password) {
        getFeedback(password);
      } else {
        setFeedback(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [password, getFeedback]);

  if (!password) return null;

  const score = feedback?.strengthScore ?? 0;
  const isStrong = feedback?.isStrong ?? false;

  const getBarColor = (s: number) => {
    if (s < 40) return "bg-destructive";
    if (s < 70) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className="mt-4 space-y-3 p-4 rounded-lg bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : isStrong ? (
            <ShieldCheck className="h-4 w-4 text-primary" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-yellow-500" />
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Security Analysis
          </span>
        </div>
        <span className="text-xs font-bold text-primary">{score}%</span>
      </div>

      <Progress 
        value={score} 
        className="h-1.5" 
      />

      {feedback && (
        <ul className="space-y-1.5">
          {feedback.feedback.map((point, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary/50" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
