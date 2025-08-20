import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata = {
  title: 'CV Screener - AI-Powered Candidate Screening',
  description:
    'Bulk upload CVs, leverage AI for pre-screening, and review candidates efficiently. Secure, fast, and GDPR-compliant CV screening for modern teams.',
  generator: 'Next.js 15',
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
