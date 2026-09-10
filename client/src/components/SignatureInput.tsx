import type { ChangeEvent } from "react";

interface SignatureInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function SignatureInput({ value, onChange, disabled = false }: SignatureInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="signature" className="block text-sm font-semibold text-(--text)">
        Email Signature
      </label>
      <input
        id="signature"
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Customer Support"
        className="w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-4 py-2 text-(--text) shadow-sm outline-none transition placeholder:text-(--placeholder) focus:border-(--accent) focus:ring-2 focus:ring-(--accent) disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-xs text-(--text-secondary)">
        This signature will be appended to every AI-generated email.
      </p>
    </div>
  );
}
