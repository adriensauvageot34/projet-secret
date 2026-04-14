export function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR", { hour12: false });
}
