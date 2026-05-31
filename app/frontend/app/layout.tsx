import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import NavLinks from '../src/components/NavLinks';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V12h6v10" />
      <path d="M8 6h.01M12 6h.01M16 6h.01" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
}

export const metadata = {
  title: 'Property Insight — 地価分析',
  description: '市町村別の公示地価データを年次で可視化・分析します',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div
          style={{
            minHeight: '100vh',
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.12) 0%, transparent 60%), ' +
              'radial-gradient(ellipse 60% 40% at 100% 80%, rgba(6,182,212,0.07) 0%, transparent 60%), ' +
              '#060d1f',
          }}
        >
          {/* Ambient grid overlay */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), ' +
                'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 20%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 20%, transparent 80%)',
            }}
          />

          {/* Nav */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(6,13,31,0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 24px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 0 24px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                    flexShrink: 0,
                  }}
                >
                  <BuildingIcon />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#f1f5f9',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.1,
                    }}
                  >
                    Property Insight
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#334155',
                      letterSpacing: '0.05em',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      marginTop: '1px',
                    }}
                  >
                    地価分析プラットフォーム
                  </div>
                </div>
              </div>

              {/* Nav links (Client Component) */}
              <NavLinks />
            </div>
          </header>

          {/* Main content */}
          <main
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '40px 24px 80px',
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
