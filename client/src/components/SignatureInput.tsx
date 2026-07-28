import { ChangeEvent } from "react";

interface SignatureInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function SignatureInput({
  value,
  onChange,
  disabled = false,
}: SignatureInputProps) {
  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    onChange(event.target.value);
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="signature"
        className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
      >
        Email Signature
      </label>

      <input
        id="signature"
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Customer Support"
        className="
          w-full
          rounded-lg
          border
          border-gray-300
          bg-white
          px-4
          py-2
          text-gray-900
          shadow-sm
          focus:border-blue-500
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          disabled:cursor-not-allowed
          disabled:bg-gray-100
          dark:border-gray-700
          dark:bg-gray-800
          dark:text-white
          dark:disabled:bg-gray-900
        "
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        This signature will be appended to every AI-generated email.
      </p>
    </div>
  );
}
