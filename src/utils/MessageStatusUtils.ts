import { type OutgoingStatus } from "@/supabase/client";
// @ts-expect-error no type declarations for the core-js-pure submodule
import toReversedUntyped from "core-js-pure/actual/array/to-reversed";

// Array.prototype.toReversed, polyfilled — not in the ES2022 lib we target.
const toReversed = toReversedUntyped as <T>(items: readonly T[]) => T[];

const outgoingStatusHierarchy = [
  "pending",
  "held_for_quality_assessment",
  "accepted",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;

/**
 * From a status object determine based on the hierarchy created by the objects
 * above which his the highest status that the object has in it.
 * @param status
 * @returns
 */
export function getHighestStatus(
  status: OutgoingStatus,
): (typeof outgoingStatusHierarchy)[number] {
  if (!status) {
    return "pending";
  }

  for (const level of toReversed(outgoingStatusHierarchy)) {
    if (level in status) {
      return level;
    }
  }

  return "pending";
}

/**
 * For a given status string return the corresponding icon and color to be applied
 * @param status
 * @returns { icon: string, color: string }
 */
export function getStatusIcon(
  status: (typeof outgoingStatusHierarchy)[number],
): {
  icon: string;
  color: string;
} {
  switch (status) {
    case "pending":
    case "held_for_quality_assessment":
      return {
        icon: "clock",
        color: "",
      };
    case "accepted":
    case "sent":
      return {
        icon: "check",
        color: "",
      };
    case "delivered":
      return {
        icon: "double-check",
        color: "",
      };
    case "read":
      return {
        icon: "double-check",
        color: "text-primary",
      };
    case "failed":
      return {
        icon: "x",
        color: "text-destructive",
      };
    default:
      return { icon: "", color: "" };
  }
}

/**
 * [crm] P2-08: a human-readable reason for a failed message, for a tooltip
 * on the existing failed icon. `status.errors[]`'s actual shape is NOT one
 * type — it's genuinely heterogeneous depending on where it was written:
 * Meta's own status-webhook error object ({code, title, message, ...}),
 * a dispatcher's raw Meta rejection ({error: {message, ...}, category?}),
 * send_policy.ts's own blocked-decision shape ({category, message}), or a
 * plain string for a non-Meta error. Rather than force a precise union
 * across every dispatcher's own error handling, this tries the field paths
 * that are actually there and returns undefined (no tooltip) if none are --
 * best-effort diagnostic text, not a value anything else depends on.
 */
export function failureReason(status: OutgoingStatus): string | undefined {
  const entry = status?.errors?.[status.errors.length - 1];

  if (entry == null) return undefined;
  if (typeof entry === "string") return entry;

  if (typeof entry === "object") {
    const e = entry as {
      message?: unknown;
      title?: unknown;
      error?: { message?: unknown };
    };

    if (typeof e.message === "string") return e.message;
    if (typeof e.error?.message === "string") return e.error.message;
    if (typeof e.title === "string") return e.title;
  }

  return undefined;
}

/*
const markMessagesAsRead = async (ids: string[]) => {
  const promises = ids.map(async (id) => {
    const { error } = await MessageService.updateIncomingMessage(id, {
      status: {
        read: dayjs().toISOString(),
      },
    });

    if (error) {
      console.error(`Could not mark as read incoming message with id ${id}`);
      throw error;
    }
  });

  const responses = await Promise.all(promises);
};
*/
