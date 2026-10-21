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
  async rewrites() {
    return [
      { source: '/gallery', destination: '/user/gallery' },
      { source: '/upload', destination: '/user/upload' },
      { source: '/slideshow', destination: '/user/slideshow' },
      { source: '/vote', destination: '/user/vote' },
      { source: '/join', destination: '/user/join' },
      { source: '/projector', destination: '/user/projector' },
      { source: '/display', destination: '/user/projector' },
      { source: '/live', destination: '/user/slideshow' },
    ];
  },
};

export default nextConfig;
