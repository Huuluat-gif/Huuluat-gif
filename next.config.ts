import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {'/huong-dan.html':['./lib/admin/owner-guide.html'],'/api/admin/source':['./private-generated/lowf-source.zip'],'/api/reader/translate':['./lib/reader/data/en_US.txt','./lib/reader/data/IPA-DICT-LICENSE.txt','./lib/reader/data/CMUDICT-IPA-LICENSE.txt','./lib/reader/data/README.md']},
  async rewrites() { return [{source:'/',destination:'/lowf.html'}]; },
  async headers() { return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]}]; }
};
export default nextConfig;
