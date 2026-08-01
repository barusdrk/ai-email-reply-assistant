interface Props {
  provider:
    | "openai"
    | "gemini";

  selected:
    | "openai"
    | "gemini";

  onSelect: (
    provider:
      | "openai"
      | "gemini"
  ) => void;
}

export default function AIProviderCard({
  provider,
  selected,
  onSelect,
}: Props) {
  const active =
    provider === selected;

  return (
    <button
      type="button"
      onClick={() =>
        onSelect(provider)
      }
      className={
        active
          ? "rounded-xl border-2 border-blue-600 bg-blue-50 p-6 text-left dark:bg-blue-950"
          : "rounded-xl border p-6 text-left hover:border-blue-500"
      }
    >

      <h2 className="text-lg font-semibold">
        {provider === "openai"
          ? "OpenAI"
          : "Google Gemini"}
      </h2>

      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {provider === "openai"
          ? "Use your personal OpenAI API key."
          : "Use your personal Gemini API key."}
      </p>

      {active && (
        <div className="mt-4 text-sm font-medium text-blue-600">
          Selected
        </div>
      )}

    </button>
  );
}
