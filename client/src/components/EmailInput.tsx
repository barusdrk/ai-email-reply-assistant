import type { ChangeEvent } from "react";

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function EmailInput({
  value,
  onChange,
  disabled = false,
}: EmailInputProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="customer-email" className="block text-sm font-semibold text-(--text-h)">
        Customer Email
      </label>
      <textarea
        id="customer-email"
        rows={12}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Paste the customer's email here..."
        className="w-full rounded-lg border border-(--border) bg-(--surface) px-4 py-3 text-(--text) shadow-sm focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--accent) disabled:cursor-not-allowed disabled:bg-(--bg-secondary) dark:disabled:bg-(--surface)"
      />
    </div>
  );
}
