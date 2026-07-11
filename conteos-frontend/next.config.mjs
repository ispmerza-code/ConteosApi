import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    // ⚠ Permite que el build termine aunque haya errores de TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

