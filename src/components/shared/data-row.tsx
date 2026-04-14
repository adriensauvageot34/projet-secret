export function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}
