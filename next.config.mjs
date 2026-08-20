/** @type {import('next').NextConfig} */
const nextConfig = {
  // typescript.ignoreBuildErrors намеренно НЕ включён: production-сборка обязана
  // падать на ошибках типов. Прежде билд их пропускал и «зелёный» npm run build
  // ничего не гарантировал.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
