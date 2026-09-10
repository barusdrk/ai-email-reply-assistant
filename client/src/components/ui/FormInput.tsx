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
      <label className="mb-2 block text-sm font-medium text-(--text-h)">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-(--text) placeholder:text-(--text-secondary) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)"
      />
    </div>
  );
}
