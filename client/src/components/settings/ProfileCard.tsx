import { useEffect, useState } from "react";
import FormInput from "../ui/FormInput.js";

interface ProfileCardProps {
  name: string;
  email: string;
  avatar: string;
  onSave: (data: { name: string; email: string; avatar: string }) => Promise<void>;
}

export default function ProfileCard({ name, email, avatar, onSave }: ProfileCardProps) {
  const [profileName, setProfileName] = useState(name);
  const [profileEmail, setProfileEmail] = useState(email);
  const [profileAvatar, setProfileAvatar] = useState(avatar);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfileName(name);
    setProfileEmail(email);
    setProfileAvatar(avatar);
  }, [name, email, avatar]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ name: profileName, email: profileEmail, avatar: profileAvatar });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-(--text-h)">Profile</h2>
      <div className="mb-6 flex items-center gap-4">
        {profileAvatar ? (
          <img src={profileAvatar} alt={`${profileName || "User"} avatar`} className="h-20 w-20 rounded-full border border-(--border) object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-(--accent) text-2xl font-bold text-(--accent-contrast)">
            {(profileName || "U").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-(--text-h)">{profileName || "User"}</p>
          <p className="text-sm text-(--text-secondary)">{profileEmail}</p>
        </div>
      </div>
      <div className="space-y-4">
        <FormInput label="Name" value={profileName} onChange={setProfileName} placeholder="Name" />
        <FormInput label="Email" value={profileEmail} onChange={setProfileEmail} placeholder="Email" />
        <FormInput label="Avatar URL" value={profileAvatar} onChange={setProfileAvatar} placeholder="https://example.com/avatar.jpg" />
        <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-(--accent) px-4 py-2 text-(--accent-contrast) transition hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </section>
  );
}
