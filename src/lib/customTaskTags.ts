const CUSTOM_TAGS_STORAGE_KEY = "mous9iti_custom_tags";
const MAX_SAVED_CUSTOM_TAGS = 15;
export const CUSTOM_TAG_CATEGORIES = ["general", "exercise", "technique"] as const;
export type CustomTagCategory = (typeof CUSTOM_TAG_CATEGORIES)[number];
export interface SavedCustomTag {
  name: string;
  category: CustomTagCategory;
}

export const CUSTOM_TASK_TAGS_CHANGED_EVENT =
  "mousi9ti-custom-task-tags-changed";

const isCustomTagCategory = (value: unknown): value is CustomTagCategory =>
  CUSTOM_TAG_CATEGORIES.includes(value as CustomTagCategory);

export const getSavedCustomTagEntries = (): SavedCustomTag[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
    const tags: unknown = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(tags)) return [];
    return tags
      .map((tag): SavedCustomTag | null => {
        if (typeof tag === "string") return { name: tag, category: "general" };
        if (
          typeof tag === "object" &&
          tag !== null &&
          "name" in tag &&
          typeof tag.name === "string"
        ) {
          return {
            name: tag.name,
            category: isCustomTagCategory(tag.category)
              ? tag.category
              : "general",
          };
        }
        return null;
      })
      .filter((tag): tag is SavedCustomTag => tag !== null)
      .slice(0, MAX_SAVED_CUSTOM_TAGS);
  } catch {
    return [];
  }
};

export const getSavedCustomTags = (): string[] =>
  getSavedCustomTagEntries().map((tag) => tag.name);

export const setSavedCustomTagCategory = (
  tagName: string,
  category: CustomTagCategory,
): SavedCustomTag[] => {
  const updated = getSavedCustomTagEntries().map((tag) =>
    tag.name.toLowerCase() === tagName.toLowerCase()
      ? { ...tag, category }
      : tag,
  );
  localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(CUSTOM_TASK_TAGS_CHANGED_EVENT));
  return updated;
};

export const rememberCustomTags = (text: string): string[] => {
  const tags = [...text.matchAll(/@custom\(([^)]*)\)/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  if (tags.length === 0) return getSavedCustomTags();

  const updated = [...getSavedCustomTagEntries()];
  tags.forEach((tag) => {
    const existingIndex = updated.findIndex(
      (savedTag) => savedTag.name.toLowerCase() === tag.toLowerCase(),
    );
    const existing = existingIndex !== -1 ? updated.splice(existingIndex, 1)[0] : null;
    updated.unshift({ name: tag, category: existing?.category ?? "general" });
  });
  const limited = updated.slice(0, MAX_SAVED_CUSTOM_TAGS);
  localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(limited));
  window.dispatchEvent(new Event(CUSTOM_TASK_TAGS_CHANGED_EVENT));
  return limited.map((tag) => tag.name);
};

export const removeSavedCustomTag = (tagToRemove: string): string[] => {
  const updated = getSavedCustomTagEntries().filter(
    (tag) => tag.name.toLowerCase() !== tagToRemove.toLowerCase(),
  );
  localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(CUSTOM_TASK_TAGS_CHANGED_EVENT));
  return updated.map((tag) => tag.name);
};
