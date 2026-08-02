interface ProfileCardProps {
  name: string;
  email: string;
  avatar: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onAvatarChange: (value: string) => void;
}

export default function ProfileCard({
  name,
  email,
  avatar,
  onNameChange,
  onEmailChange,
  onAvatarChange,
}: ProfileCardProps) {
  return (
    <section className="rounded-lg border bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        Profile
      </h2>

      <div className="space-y-4">
        <input
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Name"
          value={name}
          onChange={(e) =>
            onNameChange(e.target.value)
          }
        />

        <input
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            onEmailChange(e.target.value)
          }
        />

        <input
          className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="Avatar URL"
          value={avatar}
          onChange={(e) =>
            onAvatarChange(e.target.value)
          }
        />

        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Save Profile
        </button>
      </div>
    </section>
  );
}
