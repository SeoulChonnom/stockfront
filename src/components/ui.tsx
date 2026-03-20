export function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-badge">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
