/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  experimental: {
    optimizePackageImports: [
      '@codesandbox/sandpack-react',
      '@copilotkit/react-core',
      '@copilotkit/react-ui',
      '@copilotkit/runtime-client-gql',
      'framer-motion',
      'react-markdown',
    ],
  },
  webpack: (config, { isServer }) => {
    // Suppress the critical dependency warning from @whatwg-node/fetch
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@whatwg-node\/fetch/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];
    return config;
  },
};

module.exports = nextConfig;
