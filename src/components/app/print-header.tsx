import { LogoIcon } from '@/components/brand/logo';

export function PrintHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="print-header mb-6 border-b-2 border-brand-navy pb-4">
      <div className="flex items-center gap-4">
        <LogoIcon background="light" className="h-10 w-10" />
        <div>
          <h1 className="text-lg font-bold text-brand-navy">LEJ Capital Management</h1>
          <p className="text-sm text-brand-muted">
            {title ?? 'Fund Report'} · {subtitle ?? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[9pt] text-brand-muted">
        CONFIDENTIAL — For authorised internal use only. Generated {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.
      </p>
    </div>
  );
}
