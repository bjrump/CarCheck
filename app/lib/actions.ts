import { ConvexError } from "convex/values";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export const carActionNames = [
  "create",
  "update",
  "remove",
  "saveFuelEntry",
  "removeFuelEntry",
  "addTire",
  "setTireArchived",
  "changeTires",
  "saveTuv",
  "saveInspection",
] as const;

export type CarActionName = (typeof carActionNames)[number];
export type CarActions = {
  [Name in CarActionName]: (
    args: FunctionArgs<(typeof api.cars)[Name]>,
  ) => Promise<FunctionReturnType<(typeof api.cars)[Name]>>;
};

export function errorMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string")
    return error.data;
  return "Das hat nicht geklappt. Bitte versuche es erneut.";
}
