import { ChangeEvent } from "react";

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
  const handleChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    onChange(event.target.value);
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="customer-email"
        className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
      >
        Customer Email
      </label>

      <textarea
        id="customer-email"
        rows={12}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Paste the customer's email here..."
        className="
          w-full
          rounded-lg
          border
          border-gray-300
          bg-white
          px-4
          py-3
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
    </div>
  );
}
