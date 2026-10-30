import { createLucideIcon } from "lucide-react";

export const BassIcon = createLucideIcon("Bass", [
  ["path", { d: "M10 13V5l1-3h3v3l-2 2v6", key: "neck" }],
  ["path", { d: "M10 13c-2 1-3-1-3-2-2 2-1 4-2 6-2 4 1 6 6 6s8-2 6-6c-1-2 0-4-2-6 0 2-1 3-3 2", key: "body" }],
  ["path", { d: "M10 16v4m2-4v4M9 18h4", key: "strings" }],
  ["path", { d: "M14 2h2m-2 3h2", key: "tuners" }],
]);