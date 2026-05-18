
'use server';
/**
 * @fileOverview AI agent to extract loading advice and contract details from email text or screenshots.
 *
 * - extractContractData - A function that parses input and returns structured contract information.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractContractInputSchema = z.object({
  text: z.string().optional().describe('The body of the email or pasted text.'),
  imageDataUri: z.string().optional().describe('A data URI of a screenshot containing the loading advice table.'),
});
export type ExtractContractInput = z.infer<typeof ExtractContractInputSchema>;

const ExtractContractOutputSchema = z.object({
  header: z.object({
    weekNumber: z.string().optional(),
    farm: z.string().optional(),
    pol: z.string().optional(),
    customerName: z.string().optional(),
    totalVolume: z.string().optional().describe('The total number of vans or boxes mentioned in the text (e.g., 92vans).'),
    senderEmail: z.string().optional().describe('The email address of the sender if visible.'),
    subject: z.string().optional().describe('The email subject if visible.'),
  }),
  items: z.array(z.object({
    pod: z.string(),
    total: z.number(),
    specs: z.string(),
    limitation: z.string().optional(),
    palletized: z.string().optional().describe('One of: Palletized, Breakbulk, Non-Palletized'),
    shippingLines: z.string().optional(),
    etd: z.string().optional(),
    customerContractNumber: z.string().optional(),
  })),
});
export type ExtractContractOutput = z.infer<typeof ExtractContractOutputSchema>;

export async function extractContractData(input: ExtractContractInput): Promise<ExtractContractOutput> {
  return extractContractFlow(input);
}

const extractPrompt = ai.definePrompt({
  name: 'extractContractPrompt',
  input: { schema: ExtractContractInputSchema },
  output: { schema: ExtractContractOutputSchema },
  prompt: `You are an expert logistics coordinator at TADECO/ANFLOCOR. 
Your task is to extract "Loading Advice" information from the provided input (text or image).

Fields to extract:
- WK NO / Week Number
- Farm (e.g., TADECO)
- POL (Port of Loading, e.g., DAVAO)
- Sender Email and Subject line if visible.
- Total Volume mentioned in the email body (e.g. "92vans ARH/CP18").

Table extraction:
- Extract all rows from the Loading Advice table.
- Columns: POD, Total, Specs, Limitation, Palletized/Breakbulk, Shipping Lines, ETD, and CONTRACT NUMBER.
- If POD, WK NO, Farm, or POL are grouped (merged cells), ensure every row in the output is captured with the correct values.
- For the "Palletized" column, map values like "Breakbulk" to "Breakbulk".

Input Text: {{{text}}}
Input Image: {{#if imageDataUri}}{{media url=imageDataUri}}{{/if}}`,
});

const extractContractFlow = ai.defineFlow(
  {
    name: 'extractContractFlow',
    inputSchema: ExtractContractInputSchema,
    outputSchema: ExtractContractOutputSchema,
  },
  async (input) => {
    const { output } = await extractPrompt(input);
    return output!;
  }
);
