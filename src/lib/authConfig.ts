export type AccountConfiguration =
  { enabled: true; url: string } | { enabled: false; reason: string };

export function getAccountConfiguration(
  enabled: unknown,
  deploymentUrl: unknown,
): AccountConfiguration {
  if (enabled !== "true") {
    return {
      enabled: false,
      reason: "Optional accounts are not enabled for this installation.",
    };
  }
  try {
    if (typeof deploymentUrl !== "string") throw new Error("Missing URL");
    const url = new URL(deploymentUrl);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      throw new Error("Invalid URL");
    return { enabled: true, url: url.origin };
  } catch {
    return {
      enabled: false,
      reason:
        "Account configuration is unavailable. You can continue using this device locally.",
    };
  }
}
