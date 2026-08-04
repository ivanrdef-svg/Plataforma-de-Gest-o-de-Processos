import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Lightbulb, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { generateIdeas } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Idea Spark — AI-Powered Brainstorming" },
      {
        name: "description",
        content:
          "Generate fresh ideas in seconds with AI-powered brainstorming.",
      },
      {
        property: "og:title",
        content: "Idea Spark — AI-Powered Brainstorming",
      },
      {
        property: "og:description",
        content:
          "Generate fresh ideas in seconds with AI-powered brainstorming.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const generate = useServerFn(generateIdeas);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    try {
      const result = await generate({ data: { topic: topic.trim() } });
      setIdeas(result);
    } catch (error) {
      toast.error("Failed to generate ideas. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Lovable AI</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Idea Spark
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Type a topic and get three fresh, AI-generated ideas in seconds.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., sustainable packaging, weekend side project..."
            className="h-12 flex-1 bg-card px-4 text-base shadow-sm"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="h-12 px-6 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                Generate
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {ideas.length > 0 && (
          <div className="mt-12 grid gap-4 text-left">
            {ideas.map((idea, index) => (
              <Card
                key={index}
                className="border-border/60 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Idea {index + 1}
                    </p>
                    <p className="mt-1 text-muted-foreground">{idea}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
