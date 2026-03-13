import type { NextConfig } from 'next'

const basePath = process.env.NODE_ENV === 'production' ? '/national_capital_region_data' : ''

const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ''
const geminiKeyB64 = geminiKey ? Buffer.from(geminiKey).toString('base64') : ''

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_GEMINI_KEY_B64: geminiKeyB64,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
