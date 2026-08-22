interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export default function FormInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly = false,
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border px-3 py-2 bg-white text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
      />
    </div>
  );
}
