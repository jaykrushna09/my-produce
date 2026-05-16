'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // In a real production app, you might use a more sophisticated modal
      // For development in Firebase Studio, this surfaces the rich context
      toast({
        variant: "destructive",
        title: "Security Permission Denied",
        description: `Operation: ${error.context.operation} at ${error.context.path}. Check your Security Rules.`,
      });
      
      // We also throw to trigger the Next.js error overlay in development
      // if it's a Permission Denied error, which is helpful for debugging
      console.error('Firebase Permission Denied:', error);
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
