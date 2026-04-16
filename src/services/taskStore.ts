import type { TaskRecord } from "../types";

const tasks = new Map<string, TaskRecord>();

export function saveTask(task: TaskRecord): void {
  tasks.set(task.taskId, task);
}

export function getTask(taskId: string): TaskRecord | undefined {
  return tasks.get(taskId);
}

export function updateTask(taskId: string, patch: Partial<TaskRecord>): TaskRecord | undefined {
  const current = tasks.get(taskId);
  if (!current) return undefined;

  const updated: TaskRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  tasks.set(taskId, updated);
  return updated;
}