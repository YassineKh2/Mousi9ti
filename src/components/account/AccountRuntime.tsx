import React, { useEffect, useRef, useState } from "react";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { AccountState } from "../../contexts/AccountContext";

function AccountBridge({
  client,
  onChange,
}: {
  client: ConvexReactClient;
  onChange: (state: AccountState) => void;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const actions = useAuthActions();
  const [online, setOnline] = useState(navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [callback] = useState(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("account") === "callback"
      ? { code: url.searchParams.get("code") }
      : null;
  });
  const callbackStarted = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!callback || callbackStarted.current) return;
    callbackStarted.current = true;
    window.history.replaceState({}, "", "/");
    if (!callback.code) {
      setMessage(
        "Google sign-in was cancelled or could not be completed. You can try again.",
      );
      return;
    }
    setBusy(true);
    void actions
      .signIn(undefined, { code: callback.code })
      .catch(() => {
        setMessage(
          "Could not finish Google sign-in. Please check your connection and try again.",
        );
      })
      .finally(() => setBusy(false));
  }, [actions, callback]);

  useEffect(() => {
    if (!busy && !isLoading) return;
    const timer = window.setTimeout(() => {
      setMessage(
        "The account request is still pending. You can retry the connection or keep practicing locally. A pending sign-out has not completed; your session may still be active.",
      );
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [busy, isLoading]);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    let active = true;
    let verificationTimer: number | undefined;
    const signIn = async () => {
      if (!navigator.onLine) {
        setMessage(
          "Google sign-in needs a connection. Local practice is still available.",
        );
        return;
      }
      setMessage(undefined);
      setBusy(true);
      try {
        await actions.signIn("google", { redirectTo: "/?account=callback" });
      } catch {
        setMessage(
          "Google sign-in could not start. Check your connection or account setup and try again.",
        );
      } finally {
        setBusy(false);
      }
    };
    const signOut = async () => {
      if (!navigator.onLine) {
        setMessage(
          "Reconnect to finish signing out. Your local data will remain on this device.",
        );
        return;
      }
      ++generation.current;
      setBusy(true);
      setMessage(undefined);
      try {
        await actions.signOut();
      } catch {
        setMessage(
          "Sign-out could not complete. Please try again; your local data is unchanged.",
        );
      } finally {
        setBusy(false);
      }
    };
    const state: AccountState = {
      status:
        !online || ((busy || isLoading) && message)
          ? "unavailable"
          : busy || isLoading
            ? "initializing"
            : "guest",
      message: !online
        ? "Account verification is unavailable offline. Local practice is still available."
        : message,
      signIn:
        online && !isAuthenticated && !busy && !isLoading ? signIn : undefined,
      signOut: isAuthenticated && !busy ? signOut : undefined,
    };
    onChange(state);
    if (online && isAuthenticated && !busy && !isLoading) {
      onChange({ ...state, status: "initializing" });
      verificationTimer = window.setTimeout(() => {
        if (active && generation.current === currentGeneration) {
          onChange({
            ...state,
            status: "unavailable",
            message:
              "Account verification timed out. Local practice is still available; reconnect or sign out to try again.",
          });
        }
      }, 12000);
      void client
        .mutation(api.account.current, {})
        .then((identity) => {
          window.clearTimeout(verificationTimer);
          if (active && generation.current === currentGeneration) {
            onChange({ ...state, status: "authenticated", identity });
          }
        })
        .catch(() => {
          window.clearTimeout(verificationTimer);
          if (active && generation.current === currentGeneration) {
            onChange({
              ...state,
              status: "unavailable",
              message:
                "Your account could not be verified. Sign out and try again; local practice is still available.",
            });
          }
        });
    }
    return () => {
      active = false;
      window.clearTimeout(verificationTimer);
    };
  }, [
    client,
    onChange,
    actions,
    busy,
    isLoading,
    isAuthenticated,
    online,
    message,
  ]);

  return null;
}

export default function AccountRuntime({
  url,
  onChange,
}: {
  url: string;
  onChange: (state: AccountState) => void;
}) {
  const [client, setClient] = useState<ConvexReactClient | null>(null);
  useEffect(() => {
    const connection = new ConvexReactClient(url, {
      unsavedChangesWarning: false,
    });
    setClient(connection);
    return () => {
      void connection.close();
    };
  }, [url]);
  if (!client) return null;
  return (
    <ConvexAuthProvider
      client={client}
      storage={window.sessionStorage}
      shouldHandleCode={false}
    >
      <AccountBridge client={client} onChange={onChange} />
    </ConvexAuthProvider>
  );
}
