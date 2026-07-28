export type Tone =
  | "friendly"
  | "formal"
  | "concise";

interface ToneSelectorProps {
  value: Tone;
  onChange: (tone: Tone) => void;
  disabled?: boolean;
}

const TONES: {
  value: Tone;
  label: string;
  description: string;
}[] = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable",
  },
  {
    value: "formal",
    label: "Formal",
    description: "Professional and respectful",
  },
  {
    value: "concise",
    label: "Concise",
    description: "Brief and direct",
  },
];

export default function ToneSelector({
  value,
  onChange,
  disabled = false,
}: ToneSelectorProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="tone"
        className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
      >
        Reply Tone
      </label>

      <select
        id="tone"
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(e.target.value as Tone)
        }
        className="
          w-full
          rounded-lg
          border
          border-gray-300
          bg-white
          px-4
          py-2
          text-gray-900
          focus:border-blue-500
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          disabled:bg-gray-100
          dark:border-gray-700
          dark:bg-gray-800
          dark:text-white
        "
      >
        {TONES.map((tone) => (
          <option
            key={tone.value}
            value={tone.value}
          >
            {tone.label} — {tone.description}
          </option>
        ))}
      </select>
    </div>
  );
}
