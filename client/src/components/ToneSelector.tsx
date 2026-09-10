import type { ReplyTone } from "../types/settings.js";

export type SelectedTone = ReplyTone | "default";

interface ToneSelectorProps {
  value: SelectedTone;
  onChange: (tone: SelectedTone) => void;
  disabled?: boolean;
  defaultReplyTone?: ReplyTone;
  useDefault?: boolean;
  label?: string;
}

const TONES: { value: ReplyTone; label: string; description: string }[] = [
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "formal", label: "Formal", description: "Professional and respectful" },
  { value: "professional", label: "Professional", description: "Business professional" },
  { value: "concise", label: "Concise", description: "Brief and direct" },
  { value: "empathetic", label: "Empathetic", description: "Supportive and understanding" },
  { value: "enthusiastic", label: "Enthusiastic", description: "Positive and energetic" },
];

const TONE_LABELS: Record<ReplyTone, string> = Object.fromEntries(
  TONES.map((tone) => [tone.value, tone.label])
) as Record<ReplyTone, string>;

export default function ToneSelector({
  value,
  onChange,
  disabled = false,
  defaultReplyTone,
  useDefault = false,
  label = "Reply Tone",
}: ToneSelectorProps) {
  const defaultLabel = defaultReplyTone ? TONE_LABELS[defaultReplyTone] : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor="tone" className="block text-sm font-semibold text-(--text)">
        {label}
      </label>

      <select
        id="tone"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as SelectedTone)}
        className="w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text) focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--accent) disabled:bg-(--bg-secondary)"
      >
        {useDefault && (
          <option value="default">
            {defaultLabel ? `Use Default (${defaultLabel})` : "Use Default"}
          </option>
        )}

        {TONES.map((tone) => (
          <option key={tone.value} value={tone.value}>
            {tone.label} — {tone.description}
          </option>
        ))}
      </select>
    </div>
  );
}
