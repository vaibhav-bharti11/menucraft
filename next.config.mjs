/** @type {import('next').NextConfig} */
const nextConfig = {
  // External images (Google Fonts for PDF templates)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'fonts.googleapis.com' },
      { protocol: 'https', hostname: 'fonts.gstatic.com' },
    ],
  },
};

export default nextConfig;
