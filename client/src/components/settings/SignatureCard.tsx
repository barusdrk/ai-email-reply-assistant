import SignatureInput from "../SignatureInput.js";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SignatureCard({
  value,
  onChange,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 text-lg font-semibold dark:text-white">
        Email Signature
      </h2>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Automatically appended to AI-generated replies.
      </p>

      <SignatureInput
        value={value}
        onChange={onChange}
      />
    </section>
  );
}
