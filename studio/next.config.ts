import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // repo é workspace: a raiz de tracing é o diretório acima
  outputFileTracingRoot: path.join(__dirname, ".."),
  // upload de PDF (manual da marca) pode passar de 10MB; o padrão do middleware
  // trunca nesse ponto e corrompe o multipart.
  experimental: {
    middlewareClientMaxBodySize: 25 * 1024 * 1024,
  },
};

export default nextConfig;
