export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950"><p className="text-sm font-medium text-red-700 dark:text-red-300">{message}</p>{onRetry && <button onClick={onRetry} className="mt-3 text-sm font-semibold underline">Try again</button>}</div>;
}
