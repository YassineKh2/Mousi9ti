import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PracticeInstrumentProvider,
  usePracticeInstrument,
} from "./PracticeInstrumentContext";

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);

afterEach(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

function installStorage(defaultInstrument?: unknown) {
  const values = new Map<string, string>();
  if (defaultInstrument !== undefined) {
    values.set("Mousi9ti_settings_v1", JSON.stringify({ defaultInstrument }));
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
    },
  });
  return values;
}

function Consumer({ name }: { name: string }) {
  const { activeInstrument } = usePracticeInstrument();
  return <output data-consumer={name}>{activeInstrument}</output>;
}

for (const [saved, expected] of [
  ["piano", "piano"],
  ["guitar", "guitar"],
  ["violin", "guitar"],
  ["Piano", "guitar"],
  [null, "guitar"],
  [undefined, "guitar"],
] as const) {
  it(`initializes both provider consumers from ${String(saved)} as ${expected}`, () => {
    const values = installStorage(saved);
    const settingsBefore = values.get("Mousi9ti_settings_v1");
    const html = renderToStaticMarkup(
      <PracticeInstrumentProvider>
        <Consumer name="dashboard" />
        <section>
          <Consumer name="routine" />
        </section>
      </PracticeInstrumentProvider>,
    );
    assert.equal(
      html,
      `<output data-consumer="dashboard">${expected}</output><section><output data-consumer="routine">${expected}</output></section>`,
    );
    assert.equal(values.get("Mousi9ti_settings_v1"), settingsBefore);
  });
}

it("renders guitar without browser storage", () => {
  Reflect.deleteProperty(globalThis, "localStorage");
  assert.equal(
    renderToStaticMarkup(
      <PracticeInstrumentProvider>
        <Consumer name="server" />
      </PracticeInstrumentProvider>,
    ),
    '<output data-consumer="server">guitar</output>',
  );
});

it("uses the safe guitar context default outside a provider", () => {
  assert.equal(
    renderToStaticMarkup(<Consumer name="outside" />),
    '<output data-consumer="outside">guitar</output>',
  );
});
