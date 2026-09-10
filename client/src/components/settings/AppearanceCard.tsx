import { useMemo } from "react";
import { useTheme } from "../../context/ThemeContext.js";
import FormInput from "../ui/FormInput.js";
import FormSelect from "../ui/FormSelect.js";

export default function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  return (
    <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-(--text-h)">Appearance</h2>
      <div className="space-y-5">
        <FormSelect label="Theme" value={theme} onChange={(value) => setTheme(value as "light" | "dark" | "system")} options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]} />
        <FormInput label="Language" value="English" onChange={() => {}} readOnly />
        <div>
          <FormInput label="Timezone" value={timezone} onChange={() => {}} readOnly />
          <p className="mt-1 text-xs text-(--text-secondary)">Automatically detected from your browser.</p>
        </div>
        <button type="button" className="rounded bg-(--accent) px-4 py-2 text-(--accent-contrast) transition hover:opacity-90">
          Save Appearance
        </button>
      </div>
    </section>
  );
}
