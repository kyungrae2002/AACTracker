import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 최적화 설정
  reactStrictMode: true,

  // 압축 설정
  compress: true,

  // 이미지 최적화
  images: {
    unoptimized: true
  },

  // 헤더 설정 - CORS 및 보안
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(*), microphone=()'
          },
          {
            key: 'Feature-Policy',
            value: 'camera *; microphone none'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
