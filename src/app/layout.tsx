import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { EventProvider } from '@/context/EventContext';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import ToastNotification from '@/components/ToastNotification';
import ZipExportModal from '@/components/ZipExportModal';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Memory Aisle — Wedding Photo Sharing Platform',
  description:
    'Web-based guest photo sharing, live rolling slideshow, voting rounds, and owner archive downloads.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#182B24',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${plusJakarta.variable}`}>
      <body className="antialiased min-h-screen bg-[#FAF8F5] text-[#1C2820] flex flex-col font-sans pb-16 md:pb-0">
        <EventProvider>
          <Navbar />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <MobileBottomNav />
          <ToastNotification />
          <ZipExportModal />
        </EventProvider>
      </body>
    </html>
  );
}
