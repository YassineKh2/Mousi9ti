export type ReleaseChangeCategory = "new" | "improved" | "fixed";

export interface ReleaseChange {
  id: string;
  category: ReleaseChangeCategory;
  title: string;
  description?: string;
  href: string;
  featured?: boolean;
}

export const RELEASE_CHANGES: ReleaseChange[] = [
  {
    id: "shareable-pages",
    category: "new",
    title: "Shareable music pages",
    description: "Send someone a direct link to the scales and chords you’re exploring.",
    href: "/scales/",
    featured: true,
  },
  {
    id: "bass-support",
    category: "new",
    title: "Bass support",
    href: "/chords/",
  },
  {
    id: "dashboard-chord-sound",
    category: "new",
    title: "Chord sound preview",
    href: "/",
  },
  {
    id: "piano-hover-highlight",
    category: "fixed",
    title: "Piano key hover highlight",
    href: "/scales/",
  },
];

export const isMajorVersionAhead = (
  currentVersion: string,
  lastSeenMajor: string,
): boolean => {
  const currentMatch = currentVersion.match(/^(?:v)?(\d+)\.\d+\.\d+(?:[-+].*)?$/);
  const lastSeenMatch = lastSeenMajor.match(/^\d+$/);
  if (!currentMatch || !lastSeenMatch) return false;

  return Number(currentMatch[1]) > Number(lastSeenMajor);
};
