import {
  getMajorMinorVersion,
  isMajorOrMinorVersionAhead,
} from "../data/releaseNotes";

export const RELEASE_ANNOUNCEMENT_STORAGE_KEY =
  "Mousi9ti_last_seen_release_version";
export const LEGACY_MAJOR_VERSION_STORAGE_KEY =
  "Mousi9ti_last_seen_major_version";

type ReleaseAnnouncementStorage = Pick<Storage, "getItem" | "setItem">;

export interface ReleaseAnnouncementStatus {
  isReturningUser: boolean;
  canOpen: boolean;
}

export const getReleaseAnnouncementStatus = (
  storage: Pick<Storage, "getItem">,
  currentVersion: string,
): ReleaseAnnouncementStatus => {
  const savedVersion = storage.getItem(RELEASE_ANNOUNCEMENT_STORAGE_KEY);
  const legacyMajor = storage.getItem(LEGACY_MAJOR_VERSION_STORAGE_KEY);
  const lastSeenVersion =
    savedVersion ??
    (legacyMajor && /^\d+$/.test(legacyMajor)
      ? `${Number(legacyMajor)}.0`
      : null);
  const isReturningUser = savedVersion !== null || legacyMajor !== null;

  return {
    isReturningUser,
    canOpen:
      isReturningUser &&
      lastSeenVersion !== null &&
      isMajorOrMinorVersionAhead(currentVersion, lastSeenVersion),
  };
};

export const markReleaseAnnouncementSeen = (
  storage: ReleaseAnnouncementStorage,
  version: string,
): boolean => {
  const majorMinorVersion = getMajorMinorVersion(version);
  if (!majorMinorVersion) return false;

  storage.setItem(RELEASE_ANNOUNCEMENT_STORAGE_KEY, majorMinorVersion);
  return true;
};
