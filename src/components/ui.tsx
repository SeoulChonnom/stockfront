import type { AriaRole } from 'react';

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
  role,
  ariaLive,
}: {
  title: string;
  description: string;
  role?: AriaRole;
  ariaLive?: 'off' | 'polite' | 'assertive';
}) {
  return (
    <section aria-live={ariaLive} className='empty-state' role={role}>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
