import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const apiSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../api/src");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    const visit = (rule: { oneOf?: unknown[]; include?: unknown; use?: unknown; loader?: unknown }) => {
      const serialized = JSON.stringify(rule.use || rule.loader || "") || "";
      if (serialized.includes("swc") && rule.include) {
        rule.include = Array.isArray(rule.include) ? [...rule.include, apiSrc] : [rule.include, apiSrc];
      }
      if (Array.isArray(rule.oneOf)) {
        for (const child of rule.oneOf) {
          if (child && typeof child === "object") visit(child as { oneOf?: unknown[]; include?: unknown; use?: unknown; loader?: unknown });
        }
      }
    };
    for (const rule of config.module.rules) {
      if (rule && typeof rule === "object") visit(rule);
    }
    return config;
  },
};

export default nextConfig;
