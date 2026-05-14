export function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className='info-badge'>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='info-row'>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function PageMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className='empty-state'>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
