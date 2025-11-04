'use client';

export default function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <div className="rounded-xl border border-nuanu-grey-dark/30 bg-card px-6 py-4 text-sm text-muted-foreground shadow-sm">
        {message}
      </div>
    </div>
  );
}

