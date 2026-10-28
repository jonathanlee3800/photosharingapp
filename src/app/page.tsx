import { redirect } from 'next/navigation';

// The site root is the host entry point. Middleware already redirects "/" (to /host/events when
// signed in), so this only runs as a fallback. Guests arrive via /user/<eventId> (QR code / link).
export default function HomePage() {
  redirect('/host/login');
}
