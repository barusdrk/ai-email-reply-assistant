import { useEffect, useRef, useState, type ChangeEvent } from "react";
import FormInput from "../ui/FormInput.js";

interface ProfileCardProps {
  name: string;
  email: string;
  avatar: string;
  onSave: (data: { name: string; email: string; avatar?: string }) => Promise<void>;
}

export default function ProfileCard({ name, email, avatar, onSave }: ProfileCardProps) {
  const [profileName, setProfileName] = useState(name);
  const [profileEmail, setProfileEmail] = useState(email);
  const [profileAvatar, setProfileAvatar] = useState(avatar);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileName(name);
    setProfileEmail(email);
    setProfileAvatar(avatar);
  }, [name, email, avatar]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name: profileName,
        email: profileEmail,
        ...(profileAvatar !== avatar ? { avatar: profileAvatar } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
      setUploadError("Choose a JPEG, PNG, GIF, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Choose an image that is 2 MB or smaller.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileAvatar(typeof reader.result === "string" ? reader.result : "");
      setUploadError("");
    };
    reader.onerror = () => setUploadError("The selected image could not be read.");
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setProfileAvatar("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div>
          <label className="mb-1 block text-sm font-medium text-(--text-h)" htmlFor="avatar-upload">Avatar image</label>
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileInputRef} id="avatar-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarChange} className="block text-sm text-(--text-secondary) file:mr-3 file:rounded file:border-0 file:bg-(--bg-secondary) file:px-3 file:py-2 file:text-sm file:font-medium file:text-(--text-h) hover:file:bg-(--surface-hover)" />
            {profileAvatar && <button type="button" onClick={removeAvatar} className="text-sm text-(--danger-text) hover:underline">Remove image</button>}
          </div>
          <p className="mt-1 text-xs text-(--text-secondary)">JPEG, PNG, GIF, or WebP. Maximum 2 MB.</p>
          {uploadError && <p className="mt-1 text-sm text-(--danger-text)">{uploadError}</p>}
        </div>
        <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-(--accent) px-4 py-2 text-(--accent-contrast) transition hover:opacity-90 disabled:opacity-60">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </section>
  );
}
