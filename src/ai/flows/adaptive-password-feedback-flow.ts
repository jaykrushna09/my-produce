'use server';
/**
 * @fileOverview Provides real-time password strength feedback and security advice.
 *
 * - adaptivePasswordFeedback - A function that evaluates password strength and provides feedback.
 * - AdaptivePasswordFeedbackInput - The input type for the adaptivePasswordFeedback function.
 * - AdaptivePasswordFeedbackOutput - The return type for the adaptivePasswordFeedback function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdaptivePasswordFeedbackInputSchema = z.object({
  password: z.string().describe('The password string to be evaluated.'),
});
export type AdaptivePasswordFeedbackInput = z.infer<typeof AdaptivePasswordFeedbackInputSchema>;

const AdaptivePasswordFeedbackOutputSchema = z.object({
  strengthScore: z.number().int().min(0).max(100).describe('A numerical score indicating password strength (0-100).'),
  feedback: z.array(z.string()).describe('A list of actionable feedback points or security advice.'),
  isStrong: z.boolean().describe('True if the password is considered strong based on predefined criteria, otherwise false.'),
});
export type AdaptivePasswordFeedbackOutput = z.infer<typeof AdaptivePasswordFeedbackOutputSchema>;

export async function adaptivePasswordFeedback(input: AdaptivePasswordFeedbackInput): Promise<AdaptivePasswordFeedbackOutput> {
  return adaptivePasswordFeedbackFlow(input);
}

const passwordFeedbackPrompt = ai.definePrompt({
  name: 'passwordFeedbackPrompt',
  input: { schema: AdaptivePasswordFeedbackInputSchema },
  output: { schema: AdaptivePasswordFeedbackOutputSchema },
  prompt: `You are an AI security assistant specializing in password strength evaluation. Your task is to analyze the provided password and give comprehensive feedback.

Evaluate the following password:
Password: "{{{password}}}"

Provide a numerical strength score from 0 (very weak) to 100 (very strong). Also, generate a list of specific, actionable feedback points or security advice to improve the password's strength, even if it's already strong. Finally, indicate whether the password is "strong" (consider a score of 70 or higher as strong).

If the password is empty or very short, prioritize feedback about length and suggest adding more characters.`,
});

const adaptivePasswordFeedbackFlow = ai.defineFlow(
  {
    name: 'adaptivePasswordFeedbackFlow',
    inputSchema: AdaptivePasswordFeedbackInputSchema,
    outputSchema: AdaptivePasswordFeedbackOutputSchema,
  },
  async (input) => {
    const { output } = await passwordFeedbackPrompt(input);
    return output!;
  }
);
