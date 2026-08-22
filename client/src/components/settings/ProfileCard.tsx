import { useEffect, useState } from "react";
import FormInput from "../ui/FormInput.js";

interface ProfileCardProps {
  name: string;
  email: string;
  avatar: string;
  onSave: (data: {
    name: string;
    email: string;
    avatar: string;
  }) => Promise<void>;
}

export default function ProfileCard({
  name,
  email,
  avatar,
  onSave,
}: ProfileCardProps) {
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
      await onSave({
        name: profileName,
        email: profileEmail,
        avatar: profileAvatar,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        Profile
      </h2>

      <div className="mb-6 flex items-center gap-4">
        {profileAvatar ? (
          <img
            src={profileAvatar}
            alt={`${profileName || "User"} avatar`}
            className="h-20 w-20 rounded-full border border-gray-300 object-cover dark:border-gray-600"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
            {(profileName || "U")
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        <div>
          <p className="font-semibold dark:text-white">
            {profileName || "User"}
          </p>

          <p className="text-sm text-gray-500">
            {profileEmail}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <FormInput
          label="Name"
          value={profileName}
          onChange={setProfileName}
          placeholder="Name"
        />

        <FormInput
          label="Email"
          value={profileEmail}
          onChange={setProfileEmail}
          placeholder="Email"
        />

        <FormInput
          label="Avatar URL"
          value={profileAvatar}
          onChange={setProfileAvatar}
          placeholder="https://example.com/avatar.jpg"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Profile"}
        </button>
      </div>
    </section>
  );
}
