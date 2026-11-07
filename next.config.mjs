/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Old event-less shortcuts (/gallery, /upload, ...) are redirected to the PIN screen in middleware,
  // because without an event in the address they would show whatever event the browser opened last.
};

export default nextConfig;
