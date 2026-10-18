/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Forces all CSS and JS chunks to use relative paths (./_next/...)
  assetPrefix: './',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;