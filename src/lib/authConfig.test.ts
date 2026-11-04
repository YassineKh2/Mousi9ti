import assert from "node:assert/strict";
import { it } from "node:test";
import { getAccountConfiguration } from "./authConfig";

it("keeps accounts disabled unless explicitly enabled, even with a deployment URL", () => {
  for (const enabled of [undefined, "", "false", true]) {
    assert.equal(
      getAccountConfiguration(enabled, "https://example.convex.cloud").enabled,
      false,
    );
  }
});

it("degrades to local-only use for missing or invalid account configuration", () => {
  for (const url of [
    undefined,
    "",
    "not-a-url",
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com/path",
    "https://example.com?token=secret",
    "https://example.com/#fragment",
  ]) {
    assert.equal(getAccountConfiguration("true", url).enabled, false);
  }
});

it("accepts HTTPS deployments and loopback development without reading or writing storage", () => {
  assert.deepEqual(
    getAccountConfiguration("true", "https://example.convex.cloud/"),
    {
      enabled: true,
      url: "https://example.convex.cloud",
    },
  );
  assert.deepEqual(getAccountConfiguration("true", "http://127.0.0.1:3210"), {
    enabled: true,
    url: "http://127.0.0.1:3210",
  });
});
