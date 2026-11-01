import {
  getMajorMinorVersion,
  isMajorOrMinorVersionAhead,
} from "../data/releaseNotes";

export const RELEASE_ANNOUNCEMENT_STORAGE_KEY =
  "Mousi9ti_last_seen_release_version";
export const LEGACY_MAJOR_VERSION_STORAGE_KEY =
  "Mousi9ti_last_seen_major_version";

// Users from before release markers existed only have their app data.
const EXISTING_USER_DATA_KEYS = [
  "Mousi9ti_settings_v1",
  "Mousi9ti_sessions_v1",
  "Mousi9ti_streak_v1",
  "Mousi9ti_task_activities_v1",
  "Mousi9ti_practice_activities_v1",
  "Mousi9ti_chord_selections_v1",
  "Mousi9ti_dashboard_layout_v2",
  "Mousi9ti_tour_done",
  "mous9iti_tasks",
  "mous9iti_weekly_schedule",
  "fretmaster_streak_v1",
];

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
  const hasExistingData = EXISTING_USER_DATA_KEYS.some(
    (key) => storage.getItem(key) !== null,
  );
  const isReturningUser =
    savedVersion !== null || legacyMajor !== null || hasExistingData;
  const lastSeenVersion =
    savedVersion ??
    (legacyMajor && /^\d+$/.test(legacyMajor)
      ? `${Number(legacyMajor)}.0`
      : isReturningUser
        ? "0.0"
        : null);

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
