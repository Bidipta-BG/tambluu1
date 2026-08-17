/**
 * Lightweight className merger — joins truthy strings.
 * Avoids adding clsx as a dependency for now.
 */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(" ");
}
