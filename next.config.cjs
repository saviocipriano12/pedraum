/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  experimental: {
    css: {
      engine: 'legacy',
    },
  },
};

module.exports = nextConfig;
