import { useState } from "react";
import { normalizeRichContent } from "@/utils/grooveEmbed";

type Props = {
  initial?: string;
  onChange?: (value: string) => void;
};

export default function ContentEditor({ initial = "", onChange }: Props) {
  const [value, setValue] = useState(initial);

  function handleBlur() {
    const normalized = normalizeRichContent(value);
    setValue(normalized);
    onChange?.(normalized);
  }

  return (
    <textarea
      className="w-full min-h-[200px] border rounded p-3"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="Plak hier je Groovescribe of YouTube (URL/iframe/query)…"
    />
  );
}