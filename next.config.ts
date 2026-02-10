/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  serverExternalPackages: ["@huggingface/transformers"],
};

module.exports = nextConfig;