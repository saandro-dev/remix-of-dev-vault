import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ value, onChange, placeholder, className }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInput("");
    },
    [value, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => onChange(value.filter((t) => t !== tag)),
    [value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 text-xs">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={placeholder}
        className="text-sm"
      />
    </div>
  );
}
