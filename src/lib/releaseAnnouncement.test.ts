import assert from "node:assert/strict";
import { it } from "node:test";
import {
  getReleaseAnnouncementStatus,
  LEGACY_MAJOR_VERSION_STORAGE_KEY,
  markReleaseAnnouncementSeen,
  RELEASE_ANNOUNCEMENT_STORAGE_KEY,
} from "./releaseAnnouncement";

class MemoryStorage {
  private readonly values: Map<string, string>;

  constructor(entries: Record<string, string> = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  entries(): Record<string, string> {
    return Object.fromEntries(this.values);
  }
}

it("does not offer the popup to a new user", () => {
  const storage = new MemoryStorage();

  assert.deepEqual(getReleaseAnnouncementStatus(storage, "2.2.0"), {
    isReturningUser: false,
    canOpen: false,
  });
});

it("offers an unseen major or minor release to a returning user", () => {
  const storage = new MemoryStorage({
    [LEGACY_MAJOR_VERSION_STORAGE_KEY]: "2",
  });

  assert.deepEqual(getReleaseAnnouncementStatus(storage, "3.0.0"), {
    isReturningUser: true,
    canOpen: true,
  });
  assert.deepEqual(getReleaseAnnouncementStatus(storage, "2.1.0"), {
    isReturningUser: true,
    canOpen: true,
  });
});

it("does not offer the popup again for a patch release or a release already seen", () => {
  const storage = new MemoryStorage({
    [RELEASE_ANNOUNCEMENT_STORAGE_KEY]: "2.2",
    [LEGACY_MAJOR_VERSION_STORAGE_KEY]: "2",
  });

  assert.equal(getReleaseAnnouncementStatus(storage, "2.2.4").canOpen, false);
  assert.equal(getReleaseAnnouncementStatus(storage, "2.2.0").canOpen, false);
  assert.equal(getReleaseAnnouncementStatus(storage, "2.3.0").canOpen, true);
});

it("supports legacy major-version markers without changing them", () => {
  const storage = new MemoryStorage({
    [LEGACY_MAJOR_VERSION_STORAGE_KEY]: "2",
    "Mousi9ti_settings_v1": '{"theme":"light"}',
    "Mousi9ti_sessions_v1": '[{"id":"practice-session"}]',
  });
  const before = storage.entries();

  assert.equal(markReleaseAnnouncementSeen(storage, "3.1.7"), true);
  assert.deepEqual(storage.entries(), {
    ...before,
    [RELEASE_ANNOUNCEMENT_STORAGE_KEY]: "3.1",
  });
  assert.deepEqual(getReleaseAnnouncementStatus(storage, "3.1.0"), {
    isReturningUser: true,
    canOpen: false,
  });
});

it("does not write storage for an invalid version", () => {
  const storage = new MemoryStorage({
    "Mousi9ti_settings_v1": '{"theme":"light"}',
  });
  const before = storage.entries();

  assert.equal(markReleaseAnnouncementSeen(storage, "next"), false);
  assert.deepEqual(storage.entries(), before);
});
