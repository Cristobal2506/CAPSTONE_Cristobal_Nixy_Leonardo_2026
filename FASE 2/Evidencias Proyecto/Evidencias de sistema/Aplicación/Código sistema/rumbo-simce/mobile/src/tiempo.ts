/** 95 → «1:35» */
export const mmss = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.max(0, Math.round(seg % 60))).padStart(2, '0')}`;
