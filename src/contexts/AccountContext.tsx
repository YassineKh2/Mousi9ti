import React, {
  Component,
  Suspense,
  createContext,
  lazy,
  useContext,
  useEffect,
  useState,
} from "react";
import { getAccountConfiguration } from "../lib/authConfig";

export type AccountStatus =
  "guest" | "initializing" | "authenticated" | "unavailable";
export interface AccountState {
  status: AccountStatus;
  message?: string;
  identity?: { email: string | null; name: string | null };
  signIn?: () => Promise<void>;
  signOut?: () => Promise<void>;
  retry?: () => void;
}

const unavailable: AccountState = {
  status: "unavailable",
  message: "Accounts are unavailable. Your local workspace is still available.",
};
const AccountContext = createContext<AccountState>(unavailable);
export const useAccount = () => useContext(AccountContext);
const AccountRuntime = lazy(
  () => import("../components/account/AccountRuntime"),
);

class AccountErrorBoundary extends Component<
  {
    children: React.ReactNode;
    onFailure: (state: AccountState) => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure(unavailable);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function OptionalAccounts({ children }: { children: React.ReactNode }) {
  const [configuration] = useState(() =>
    getAccountConfiguration(
      import.meta.env?.VITE_ACCOUNTS_ENABLED,
      import.meta.env?.VITE_CONVEX_URL,
    ),
  );
  const [account, setAccount] = useState<AccountState>(() =>
    "reason" in configuration
      ? { status: "unavailable", message: configuration.reason }
      : { status: "initializing" },
  );
  const [connectionVersion, setConnectionVersion] = useState(0);
  const retry = () => {
    setAccount({ status: "initializing" });
    setConnectionVersion((version) => version + 1);
  };

  useEffect(() => {
    if (!configuration.enabled) return;
    const timer = window.setTimeout(
      () =>
        setAccount((current) =>
          current.status === "initializing"
            ? {
                ...current,
                status: "unavailable",
                message:
                  "Account verification is taking longer than expected. Local practice is still available.",
              }
            : current,
        ),
      12000,
    );
    return () => window.clearTimeout(timer);
  }, [configuration, connectionVersion]);

  return (
    <AccountContext.Provider
      value={{ ...account, retry: configuration.enabled ? retry : undefined }}
    >
      {children}
      {configuration.enabled && (
        <AccountErrorBoundary key={connectionVersion} onFailure={setAccount}>
          <Suspense fallback={null}>
            <AccountRuntime url={configuration.url} onChange={setAccount} />
          </Suspense>
        </AccountErrorBoundary>
      )}
    </AccountContext.Provider>
  );
}
