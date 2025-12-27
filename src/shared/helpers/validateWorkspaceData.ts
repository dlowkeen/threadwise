import { Workspace } from "@/types/workspace.types";

/**
 * Validates and sanitizes workspace ID
 */
export function validateWorkspaceId(workspaceId: string): string {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
    throw new Error('Workspace ID is required and must be a non-empty string');
  }
  return workspaceId.trim();
}

/**
 * Validates and filters channel IDs array
 */
export function validateChannels(channels: any): string[] {

  // Filter out non-strings, null, undefined, empty strings
  const validChannels = channels
    .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id: string) => id.trim());

  return validChannels;
}

/**
 * Validates and clamps thread threshold value
 */
export function validateThreadThreshold(data: any): number {
  // Validate that it is a number and that it is equal or greater than 2
  if (typeof data === "number" && !isNaN(data) && data >= 2) {
    return data;
  }
  return 2; 
}
