export const secondsUntil = (iso: string) => Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
