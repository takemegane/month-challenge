/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    reactCompiler: false,
  },
  serverExternalPackages: ['sharp'],
};

export default nextConfig;

