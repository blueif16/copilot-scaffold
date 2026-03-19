/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Suppress critical dependency warning from @whatwg-node/fetch
    // This is a known issue with graphql-yoga and copilotkit runtime
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Handle node-ponyfill dynamic import warning
    config.resolve.conditionNames = [
      ...(config.resolve.conditionNames || []),
      'node',
    ];

    return config;
  },

  // Suppress specific webpack warnings
  webpack5: true,

  // Ignore specific warnings in development
  onDemandEntries: {
    // Ensure entries are disposed properly to avoid HMR issues
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
