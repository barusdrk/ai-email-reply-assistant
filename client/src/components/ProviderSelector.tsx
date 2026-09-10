import type { AIProvider } from "../types/settings.js";

interface ProviderSelectorProps {
  value: AIProvider;
  onChange: (value: AIProvider) => void;
  label?: string;
}

const providers: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "groq", label: "Groq" },
  { value: "claude", label: "Claude" },
];

export default function ProviderSelector({ value, onChange, label = "AI Provider" }: ProviderSelectorProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-(--text-h)">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as AIProvider)} className="w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text) outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent)">
        {providers.map((provider) => (
          <option key={provider.value} value={provider.value}>{provider.label}</option>
        ))}
      </select>
    </label>
  );
}
