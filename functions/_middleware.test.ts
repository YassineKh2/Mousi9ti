import assert from "node:assert/strict";
import { it } from "node:test";
import { onRequest } from "./_middleware";

it("redirects the www host to HTTPS canonical host and preserves the URL", async () => {
  const response = await onRequest({
    request: new Request("http://www.mousi9ti.com/chords/e/minor-7th?x=1"),
    next: async () => new Response("next"),
  });

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://mousi9ti.com/chords/e/minor-7th?x=1",
  );
});

it("passes canonical-host requests through", async () => {
  const response = await onRequest({
    request: new Request("https://mousi9ti.com/chords/"),
    next: async () => new Response("next"),
  });

  assert.equal(await response.text(), "next");
});
