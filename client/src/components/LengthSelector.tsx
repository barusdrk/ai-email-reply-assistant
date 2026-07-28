export type ReplyLength =
  | "short"
  | "medium"
  | "long";

interface LengthSelectorProps {
  value: ReplyLength;
  onChange: (length: ReplyLength) => void;
  disabled?: boolean;
}

const LENGTHS: {
  value: ReplyLength;
  label: string;
  description: string;
}[] = [
  {
    value: "short",
    label: "Short",
    description: "Up to 100 words",
  },
  {
    value: "medium",
    label: "Medium",
    description: "100–180 words",
  },
  {
    value: "long",
    label: "Long",
    description: "180–300 words",
  },
];

export default function LengthSelector({
  value,
  onChange,
  disabled = false,
}: LengthSelectorProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="reply-length"
        className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
      >
        Reply Length
      </label>

      <select
        id="reply-length"
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(
            e.target.value as ReplyLength
          )
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
        {LENGTHS.map((length) => (
          <option
            key={length.value}
            value={length.value}
          >
            {length.label} — {length.description}
          </option>
        ))}
      </select>
    </div>
  );
}
