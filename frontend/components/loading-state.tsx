export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="space-y-3" role="status">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />)}<span className="sr-only">{label}</span></div>;
}
