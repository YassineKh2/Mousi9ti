export function isPracticeDayComplete(
  plannedTaskIds: string[],
  completedTaskIds: ReadonlySet<string>,
  hasGeneralTime: boolean,
): boolean {
  return plannedTaskIds.length
    ? plannedTaskIds.every((taskId) => completedTaskIds.has(taskId))
    : hasGeneralTime;
}
