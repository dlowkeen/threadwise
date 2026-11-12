import { Workspace } from "@/types/workspace.types";


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
