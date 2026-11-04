import React from "react";
import {
  LogIn,
  LogOut,
  LoaderCircle,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { useAccount } from "../../contexts/AccountContext";

export function AccountPanel() {
  const account = useAccount();
  return (
    <section aria-labelledby="account-heading" className="space-y-4">
      <h3
        id="account-heading"
        className="flex items-center gap-2 font-mono text-sm font-semibold text-on-surface"
      >
        <UserRound size={16} aria-hidden="true" /> Optional account
      </h3>
      <div
        role="status"
        aria-live="polite"
        className="space-y-2 text-sm text-on-surface"
      >
        {account.status === "guest" && <p>Guest / signed out</p>}
        {account.status === "initializing" && (
          <p className="flex items-center gap-2">
            <LoaderCircle
              size={16}
              className="animate-spin"
              aria-hidden="true"
            />{" "}
            Checking account...
          </p>
        )}
        {account.status === "authenticated" && (
          <p className="wrap-break-word">
            Signed in as{" "}
            {account.identity?.email ||
              account.identity?.name ||
              "Google account"}
          </p>
        )}
        {account.status === "unavailable" && <p>Authentication unavailable</p>}
        {account.message && (
          <p className="text-on-surface-variant">{account.message}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {account.status === "unavailable" && account.retry && (
          <button
            type="button"
            onClick={account.retry}
            className="flex min-h-10 items-center gap-2 rounded border border-outline-variant/50 px-4 py-2 text-sm text-on-surface hover:bg-surface-container"
          >
            <RotateCcw size={16} aria-hidden="true" /> Retry account connection
          </button>
        )}
        {account.signIn && account.status !== "authenticated" && (
          <button
            type="button"
            onClick={() => void account.signIn?.()}
            disabled={account.status === "initializing"}
            className="flex min-h-10 items-center gap-2 rounded border border-outline-variant/50 px-4 py-2 text-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
          >
            <LogIn size={16} aria-hidden="true" /> Continue with Google
          </button>
        )}
        {account.signOut && (
          <button
            type="button"
            onClick={() => void account.signOut?.()}
            className="flex min-h-10 items-center gap-2 rounded border border-outline-variant/50 px-4 py-2 text-sm text-on-surface hover:bg-surface-container"
          >
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        )}
      </div>
      <div className="space-y-2 border-t border-outline-variant/20 pt-4 text-xs leading-relaxed text-on-surface-variant">
        <p>
          Cloud synchronization is not enabled. Signing in does not upload,
          download, or assign your practice data to an account.
        </p>
        <p>
          Your data stays in this browser and is shared by anyone using this
          browser profile, regardless of which account is signed in. Signing out
          does not remove it from this device.
        </p>
        <p>
          Google handles account creation and returning sign-ins. Account
          sessions are limited to this browser tab.
        </p>
      </div>
    </section>
  );
}
