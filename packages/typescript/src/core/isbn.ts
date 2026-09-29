/** Scanners and people add spaces and hyphens; an ISBN-10 may end in x/X. Exact lookups need neither. */
export const cleanIsbn = (code: string) => code.replace(/[\s-]/g, "").toUpperCase();
