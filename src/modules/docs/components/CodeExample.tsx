import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/CodeBlock";
import type { ApiCodeExample } from "../types";

interface CodeExampleProps {
  examples: ApiCodeExample[];
}

export function CodeExample({ examples }: CodeExampleProps) {
  const [activeTab, setActiveTab] = useState(examples[0]?.language ?? "");

  if (examples.length === 0) return null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-muted/50">
        {examples.map((ex) => (
          <TabsTrigger key={ex.language} value={ex.language} className="text-xs">
            {ex.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {examples.map((ex) => (
        <TabsContent key={ex.language} value={ex.language} className="mt-3">
          <CodeBlock code={ex.code} language={ex.language} showLineNumbers={false} maxHeight="500px" />
        </TabsContent>
      ))}
    </Tabs>
  );
}
