/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained build for Docker
  output: 'standalone',

  async rewrites() {
    // In Docker the backend is reachable at http://backend:8000 (internal network).
    // In local dev it falls back to http://localhost:8000.
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
