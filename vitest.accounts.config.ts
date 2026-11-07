import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/components/account/**/*.auth.test.tsx"],
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3001/" } },
  },
});
