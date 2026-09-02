export function AccessDenied({ reason }: { reason?: string }) {
  return (
    <div className="alert warn">
      {reason ?? "You don't have permission to view this section. Contact a church administrator if you believe this is a mistake."}
    </div>
  );
}
