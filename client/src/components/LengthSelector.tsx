export type ReplyLengthValue = "short" | "medium" | "long";
export type ReplyLength = "default" | ReplyLengthValue;

interface Props {
  value: ReplyLength;
  onChange: (value: ReplyLength) => void;
  defaultLength?: ReplyLengthValue;
  label?: string;
  useDefault?: boolean;
}

function formatLength(value: ReplyLengthValue) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function LengthSelector({
  value,
  onChange,
  defaultLength,
  label = "Reply Length",
  useDefault = false,
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-(--text-h)">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ReplyLength)}
        className="
          w-full cursor-pointer rounded-lg border border-(--border) bg-(--surface) py-2 pl-3 pr-10 text-(--text) transition
        "
      >
        {useDefault && (
          <option value="default">
            {defaultLength
              ? `Use Default (${formatLength(defaultLength)})`
              : "Use Default"}
          </option>
        )}
        <option value="short">Short</option>
        <option value="medium">Medium</option>
        <option value="long">Long</option>
      </select>
    </div>
  );
}
