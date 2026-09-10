interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

export default function FormSelect({
  label,
  value,
  options,
  onChange,
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-(--text-h)">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-(--text) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
