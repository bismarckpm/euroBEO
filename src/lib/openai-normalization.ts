import OpenAI from "openai";
import { withRetry, type NormalizationProvider } from "../core/normalization/provider";
import { promptFor } from "../core/normalization/schemas";

export function createOpenAIProvider(options: {
  apiKey: string;
  model: string;
  timeoutMs: number;
}): NormalizationProvider {
  const client = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs,
    maxRetries: 0,
  });

  return {
    async complete(request) {
      return withRetry(async () => {
        const completion = await client.chat.completions.create({
          model: options.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: promptFor(request.task, request.catalog) },
            { role: "user", content: request.fragment },
          ],
        });
        const content = completion.choices[0]?.message.content;
        if (!content) {
          throw new Error("La IA no devolvió contenido.");
        }
        return JSON.parse(content) as unknown;
      });
    },
  };
}
