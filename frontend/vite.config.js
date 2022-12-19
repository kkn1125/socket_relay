import { defineConfig, loadEnv } from "vite";
import dotenv from "dotenv";
import path from "path";

export default defineConfig(({ command, mode, ssrBuild }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");
  dotenv.config({
    path: path.join(__dirname, ".env"),
  });
  dotenv.config({
    path: path.join(__dirname, `.env.${mode}`),
  });

  const API_HOST = process.env.API_HOST;
  const API_PORT = process.env.API_PORT;
  return {
    // vite config
    define: {
      __APP_ENV__: env.APP_ENV,
    },
    server: {
      host: process.env.HOST,
      port: process.env.PORT,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/v1/query": {
          target: `http://${API_HOST}:${API_PORT}`,
          rewrite: (path) => path.replace(/^\/v1\/query/, ""),
          changeOrigin: true,
          ws: false,
        },
      },
    },
  };
});
