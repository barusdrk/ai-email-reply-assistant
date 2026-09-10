interface Props {
  provider: "openai" | "gemini";
  selected: "openai" | "gemini";
  onSelect: (provider: "openai" | "gemini") => void;
}

export default function AIProviderCard({ provider, selected, onSelect }: Props) {
  const active = provider === selected;

  return (
    <button type="button" onClick={() => onSelect(provider)} className={`rounded-xl border p-6 text-left transition ${active ? "border-(--accent) bg-(--surface-hover)" : "border-(--border) bg-(--surface) hover:border-(--accent)"}`}>
      <h2 className="text-lg font-semibold text-(--text-h)">
        {provider === "openai" ? "OpenAI" : "Google Gemini"}
      </h2>
      <p className="mt-2 text-sm text-(--text-secondary)">
        {provider === "openai" ? "Use your personal OpenAI API key." : "Use your personal Gemini API key."}
      </p>
      {active && <div className="mt-4 text-sm font-medium text-(--accent)">Selected</div>}
    </button>
  );
}
