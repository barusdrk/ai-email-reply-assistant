interface Props {
  onDeleteAccount: () => Promise<void>;
}

export default function DangerZoneCard({
  onDeleteAccount,
}: Props) {
  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Delete your account permanently?"
      );

    if (!confirmed) {
      return;
    }

    await onDeleteAccount();
  }

  return (
    <section className="rounded-xl border border-red-300 bg-red-50 p-6 dark:border-red-700 dark:bg-red-950">
      <h2 className="mb-2 text-lg font-semibold text-red-600">
        Danger Zone
      </h2>

      <p className="mb-4 text-sm text-red-500">
        This action cannot be undone.
      </p>

      <button
        onClick={handleDelete}
        className="rounded-md bg-red-600 px-4 py-2 text-white"
      >
        Delete Account
      </button>
    </section>
  );
}
