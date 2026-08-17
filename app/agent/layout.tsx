/**
 * Agent segment layout — thin shell.
 *
 * The real auth guard lives in (protected)/layout.tsx, which only wraps
 * authenticated dashboard routes. The login/ route is a sibling of
 * (protected)/ and therefore NOT guarded.
 */
export default function AgentSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
