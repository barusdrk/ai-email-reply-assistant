import SignatureInput from "../SignatureInput.js";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SignatureCard({ value, onChange }: Props) {
  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-(--text-h)">Email Signature</h2>
      <p className="mb-4 text-sm text-(--text-secondary)">Automatically appended to AI-generated replies.</p>
      <SignatureInput value={value} onChange={onChange} />
    </section>
  );
}
