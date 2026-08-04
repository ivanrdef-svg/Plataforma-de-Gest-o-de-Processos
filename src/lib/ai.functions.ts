import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GenerateIdeasInput = z.object({
  topic: z.string().min(1).max(200),
});

export const generateIdeas = createServerFn({ method: "POST" })
  .validator((input: unknown) => GenerateIdeasInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI Gateway is not configured");

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a creative brainstorming assistant. Generate 3 concise, original, and practical ideas for the user's topic. Return your answer as a valid JSON array of strings. Each idea should be under 120 characters.",
            },
            {
              role: "user",
              content: `Generate 3 creative ideas for: ${data.topic}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Gateway returned ${response.status}: ${errorText}`);
      }

      const result = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = result.choices?.[0]?.message?.content ?? "";

      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("Invalid response format");
        return parsed.slice(0, 3).map(String);
      } catch {
        // Fallback: extract non-empty lines
        return text
          .split(/\n/)
          .map((line: string) => line.replace(/^[-*•\d.)\]]+\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 3);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Direct fetch failed: ${message}`);
    }
  });
