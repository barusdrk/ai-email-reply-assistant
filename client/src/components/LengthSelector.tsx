export type ReplyLengthValue =
  | "short"
  | "medium"
  | "long";

export type ReplyLength =
  | "default"
  | ReplyLengthValue;

interface Props {
  value: ReplyLength;
  onChange: (value: ReplyLength) => void;
  defaultLength?: ReplyLengthValue;
  label?: string;
  useDefault?: boolean;
}

function formatLength(
  value: ReplyLengthValue
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
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
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value as ReplyLength
          )
        }
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        {useDefault && (
          <option value="default">
            {defaultLength
              ? `Use Default (${formatLength(defaultLength)})`
              : "Use Default"}
          </option>
        )}

        <option value="short">
          Short
        </option>

        <option value="medium">
          Medium
        </option>

        <option value="long">
          Long
        </option>
      </select>
    </div>
  );
}
