'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function NavLink({ to, extraMatch, children }: { to: string; extraMatch?: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === to || (extraMatch ? (pathname?.startsWith(extraMatch) ?? false) : false);
  return (
    <Link
      href={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 500,
        padding: '6px 14px',
        borderRadius: '100px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        background: active ? 'rgba(56,189,248,0.12)' : 'transparent',
        color: active ? '#38bdf8' : '#64748b',
        border: active ? '1px solid rgba(56,189,248,0.25)' : '1px solid transparent',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </Link>
  );
}

export default function NavLinks() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <NavLink to="/" extraMatch="/prefecture">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        都道府県
      </NavLink>
    </nav>
  );
}
