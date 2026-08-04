interface StatCardProps {
  label: string;
  value: number;
}

/** Card de resumo numérico (ex.: "12 ingredientes cadastrados"). */
export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <p className="text-3xl font-semibold tabular-nums text-stone-900 dark:text-stone-50">
        {value}
      </p>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}
