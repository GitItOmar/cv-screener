import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'react-hot-toast';
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
      <body>
        {children}
        <Toaster
          position='top-right'
          toastOptions={{
            duration: 5000,
            style: {
              borderRadius: '8px',
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
