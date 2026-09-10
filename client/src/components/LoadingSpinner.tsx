interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "Generating AI reply...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-(--accent) border-t-transparent" />
      <p className="text-sm text-(--text-secondary)">{message}</p>
    </div>
  );
}
