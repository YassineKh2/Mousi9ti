import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OptionalAccounts } from "../../contexts/AccountContext";
import { AccountPanel } from "./AccountPanel";

const sdk = vi.hoisted(() => ({
  auth: { isLoading: false, isAuthenticated: false },
  actions: { signIn: vi.fn(), signOut: vi.fn() },
  verify: vi.fn(),
  clients: vi.fn(),
  provider: vi.fn(),
  close: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", () => ({
  ConvexAuthProvider: (props: { children: React.ReactNode }) => {
    sdk.provider(props);
    return props.children;
  },
  useAuthActions: () => sdk.actions,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => sdk.auth,
  ConvexReactClient: class {
    constructor(url: string) {
      sdk.clients(url);
    }
    mutation = sdk.verify;
    close() {
      sdk.close();
      return Promise.resolve();
    }
  },
}));

let root: Root;
let container: HTMLDivElement;
let original: string;

const workspace = () => (
  <OptionalAccounts>
    <button onClick={() => localStorage.setItem("guest-edit", "saved locally")}>
      Local practice
    </button>
    <AccountPanel />
  </OptionalAccounts>
);

async function render() {
  await act(async () => root.render(workspace()));
  if (!vi.isFakeTimers()) {
    await act(async () => {
      await vi.dynamicImportSettled();
    });
  }
}

async function click(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === label,
  );
  expect(button, `Missing button: ${label}`).toBeDefined();
  await act(async () => button!.click());
}

function preserved() {
  expect(localStorage.getItem("mous9iti_tasks")).toBe(original);
  expect(localStorage.getItem("Mousi9ti_settings_v1")).toBe(
    '{"theme":"dark","defaultInstrument":"guitar"}',
  );
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubEnv("VITE_ACCOUNTS_ENABLED", "true");
  vi.stubEnv("VITE_CONVEX_URL", "https://test.convex.cloud");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  sdk.auth = { isLoading: false, isAuthenticated: false };
  sdk.actions.signIn.mockReset().mockResolvedValue({ signingIn: false });
  sdk.actions.signOut.mockReset().mockResolvedValue(undefined);
  sdk.verify
    .mockReset()
    .mockResolvedValue({ name: "Account A", email: "a@example.com" });
  sdk.clients.mockReset();
  sdk.provider.mockClear();
  sdk.close.mockClear();
  localStorage.clear();
  sessionStorage.clear();
  original = JSON.stringify([
    { id: "legacy-task", text: "Private local practice", completed: false },
  ]);
  localStorage.setItem("mous9iti_tasks", original);
  localStorage.setItem(
    "Mousi9ti_settings_v1",
    '{"theme":"dark","defaultInstrument":"guitar"}',
  );
  window.history.replaceState({}, "", "/");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("optional accounts keep the workspace local", () => {
  it("does not construct a client when disabled or missing configuration", async () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    await render();
    expect(container.textContent).toContain("Authentication unavailable");
    expect(sdk.clients).not.toHaveBeenCalled();
    await click("Local practice");
    expect(localStorage.getItem("guest-edit")).toBe("saved locally");
    preserved();
  });

  it("shows Google sign-in for guests and delegates session storage to the library", async () => {
    await render();
    expect(container.textContent).toContain("Guest / signed out");
    expect(sdk.provider.mock.lastCall?.[0].storage).toBe(sessionStorage);
    expect(sdk.provider.mock.lastCall?.[0].shouldHandleCode).toBe(false);
    await click("Continue with Google");
    expect(sdk.actions.signIn).toHaveBeenCalledExactlyOnceWith("google", {
      redirectTo: "/?account=callback",
    });
    expect(sdk.verify).not.toHaveBeenCalled();
    preserved();
  });

  it("keeps configured deployments inert unless accounts are explicitly enabled", async () => {
    vi.stubEnv("VITE_ACCOUNTS_ENABLED", "false");
    await render();
    expect(sdk.clients).not.toHaveBeenCalled();
    await click("Local practice");
    preserved();
  });

  it("contains SDK initialization failures without removing local functionality", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sdk.clients.mockImplementation(() => {
      throw new Error("SDK unavailable");
    });
    await render();
    expect(container.textContent).toContain("Authentication unavailable");
    await click("Local practice");
    preserved();
  });

  it("keeps local actions available during authentication loading and timeout", async () => {
    await render();
    vi.useFakeTimers();
    sdk.auth = { isLoading: true, isAuthenticated: false };
    await render();
    expect(container.textContent).toContain("Checking account");
    await click("Local practice");
    expect(localStorage.getItem("guest-edit")).toBe("saved locally");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12001);
    });
    expect(container.textContent).toContain("Authentication unavailable");
    preserved();
  });

  it("handles sign-in network failures without changing local data", async () => {
    sdk.actions.signIn.mockRejectedValue(new Error("network failed"));
    await render();
    await click("Continue with Google");
    expect(container.textContent).toContain("Google sign-in could not start");
    await click("Local practice");
    preserved();
  });

  it("handles cancellation or denied consent returned without a code", async () => {
    window.history.replaceState({}, "", "/?account=callback");
    await render();
    expect(container.textContent).toContain(
      "cancelled or could not be completed",
    );
    expect(sdk.actions.signIn).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    preserved();
  });

  it("exchanges callback codes through the library and catches callback failures", async () => {
    window.history.replaceState({}, "", "/?account=callback&code=test-code");
    sdk.actions.signIn.mockRejectedValue(new Error("invalid callback"));
    await render();
    expect(sdk.actions.signIn).toHaveBeenCalledExactlyOnceWith(undefined, {
      code: "test-code",
    });
    expect(container.textContent).toContain("Could not finish Google sign-in");
    expect(window.location.search).toBe("");
    preserved();
  });

  it("checks identity server-side and never sends local content", async () => {
    sdk.auth = { isLoading: false, isAuthenticated: true };
    await render();
    expect(container.textContent).toContain("Signed in as a@example.com");
    expect(
      sdk.verify.mock.calls.every((call) => JSON.stringify(call[1]) === "{}"),
    ).toBe(true);
    expect(sdk.actions.signIn).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Cloud synchronization is not enabled",
    );
    preserved();
  });

  it("does not trust authenticated client state when the backend rejects the session", async () => {
    sdk.auth = { isLoading: false, isAuthenticated: true };
    sdk.verify.mockRejectedValue(new Error("expired session"));
    await render();
    expect(container.textContent).toContain(
      "Your account could not be verified",
    );
    expect(container.textContent).not.toContain("Signed in as");
    await click("Local practice");
    preserved();
  });

  it("bounds a pending backend verification without blocking local work", async () => {
    await render();
    vi.useFakeTimers();
    sdk.auth = { isLoading: false, isAuthenticated: true };
    sdk.verify.mockReturnValue(new Promise(() => {}));
    await render();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12001);
    });
    expect(container.textContent).toContain("Account verification timed out");
    await click("Local practice");
    preserved();
  });

  it("retains local data and hides unverified identity when offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    sdk.auth = { isLoading: false, isAuthenticated: true };
    await render();
    expect(container.textContent).toContain("unavailable offline");
    expect(sdk.verify).not.toHaveBeenCalled();
    await click("Local practice");
    await click("Sign out");
    expect(sdk.actions.signOut).not.toHaveBeenCalled();
    preserved();
  });

  it("signs out through the library and leaves data unchanged when accounts change", async () => {
    sdk.auth = { isLoading: false, isAuthenticated: true };
    sdk.actions.signOut.mockImplementation(async () => {
      sdk.auth = { isLoading: false, isAuthenticated: false };
    });
    await render();
    await click("Sign out");
    expect(sdk.actions.signOut).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Guest / signed out");
    sdk.auth = { isLoading: false, isAuthenticated: true };
    sdk.verify.mockResolvedValue({ name: "Account B", email: "b@example.com" });
    await render();
    expect(container.textContent).toContain("Signed in as b@example.com");
    preserved();
    expect(localStorage.length).toBe(2);
  });

  it("keeps local work available after sign-out failure", async () => {
    sdk.auth = { isLoading: false, isAuthenticated: true };
    sdk.actions.signOut.mockRejectedValue(new Error("unavailable"));
    await render();
    await click("Sign out");
    expect(container.textContent).toContain("Sign-out could not complete");
    await click("Local practice");
    preserved();
  });

  it("ignores a late account verification response after sign-out", async () => {
    let resolveIdentity: (value: { name: string; email: string }) => void;
    sdk.auth = { isLoading: false, isAuthenticated: true };
    sdk.verify.mockReturnValue(
      new Promise((resolve) => {
        resolveIdentity = resolve;
      }),
    );
    sdk.actions.signOut.mockImplementation(async () => {
      sdk.auth = { isLoading: false, isAuthenticated: false };
    });
    await render();
    await click("Sign out");
    await act(async () => {
      resolveIdentity!({ name: "Stale A", email: "stale@example.com" });
    });
    expect(container.textContent).toContain("Guest / signed out");
    expect(container.textContent).not.toContain("stale@example.com");
    preserved();
  });

  for (const operation of ["signIn", "signOut"] as const) {
    it(`offers connection recovery for a never-settling ${operation} request`, async () => {
      sdk.auth = { isLoading: false, isAuthenticated: operation === "signOut" };
      sdk.actions[operation].mockReturnValue(new Promise(() => {}));
      await render();
      vi.useFakeTimers();
      await click(
        operation === "signOut" ? "Sign out" : "Continue with Google",
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12001);
      });
      expect(container.textContent).toContain("Authentication unavailable");
      expect(container.textContent).toContain(
        "pending sign-out has not completed",
      );
      await click("Local practice");
      await click("Retry account connection");
      expect(sdk.close).toHaveBeenCalled();
      preserved();
    });
  }
});
