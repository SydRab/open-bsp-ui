//===================================
// UI-only types — NOT present in open-bsp-api's _shared/types/*.
//
// This file is never overwritten when re-syncing the mirrored API type files,
// so put genuinely UI-exclusive additions here (not divergences — those are
// field-level edits that must stay inline in the mirrored file, tagged with
// `// @ui-divergence`). See scripts/check-type-sync.sh.
//===================================

// The member's own per-conversation state, stored on their conversations_agents
// row (the API leaves that column untyped — "e.g. per-member state: muted,
// last_read_ts"). Written via upsert on the caller's own membership row; nulls
// retract keys through the merge_update trigger.
export type ConversationAgentExtra = {
  archived?: string | null;
  pinned?: string | null;
  draft?: {
    text: string;
    timestamp: string;
  } | null;
};

import { isInternal } from "./message_types";
import type { ConversationRow, MessageRow } from "./database_types";
import type { ConversationExtra } from "./extra_types";
import type { TemplateData } from "./whatsapp_template_types";

export type Direction = "incoming" | "outgoing" | "internal";

type Addressed = Pick<
  MessageRow,
  "sender_address" | "content" | "agent_id" | "service"
>;

// Is this room a place colleagues talk to each OTHER, or one where they answer
// somebody else together?
//
// It is a per-conversation question, and the API already answers it — RLS does,
// in get_restricted_conversations: `local` (a room of members, by definition)
// and a Slack conversation our bot is NOT in are visible by PARTICIPATION only,
// while a Slack conversation the bot sits in is org-visible, which is what a
// shared inbox is. Same line, drawn from the same two facts.
export function isTeamChat(
  conversation?: Pick<ConversationRow, "service" | "extra"> | null,
): boolean {
  if (!conversation) return false;

  if (conversation.service === "local") return true;

  if (conversation.service === "slack") {
    return !(conversation.extra as ConversationExtra | null)?.is_bot_member;
  }

  return false;
}

// `messages.direction` is gone: authorship is the addressing. But which side of
// the screen a bubble lands on is not authorship — it is authorship RELATIVE TO
// THE VIEWER, and those only coincide where the peer is a contact.
//
//   mine        agent_id is my own agent. Decided first, so a mirror service
//               filling sender_address on the echo of my own send (fill-once,
//               preserve_message_addressing) cannot flip my message to the
//               other side of the chat later.
//   team chat   the peer is a colleague, so anyone who is not me IS the other
//               side. What makes an AI DM read like a chat instead of a
//               monologue in two voices, and what puts a colleague's Slack
//               message where a colleague's message belongs.
//   a member    an inbox: whoever on our side answers, answers AS us. True of a
//               reply typed here and of one typed in Slack, in a channel our
//               bot is in. Inbound rows carry no agent_id on any service but
//               Slack, so this cannot swallow a contact.
//   otherwise   contact space: sender_address set = the peer authored it.
export function messageDirection(
  message: Addressed,
  ownAgentId?: string | null,
  teamChat?: boolean,
): Direction {
  if (isInternal(message)) return "internal";

  if (ownAgentId && message.agent_id === ownAgentId) return "outgoing";

  if (teamChat || message.service === "local") return "incoming";

  if (message.agent_id) return "outgoing";

  return message.sender_address !== null ? "incoming" : "outgoing";
}

export function isIncoming(
  message: Addressed,
  ownAgentId?: string | null,
  teamChat?: boolean,
): boolean {
  return messageDirection(message, ownAgentId, teamChat) === "incoming";
}

export function isOutgoing(
  message: Addressed,
  ownAgentId?: string | null,
  teamChat?: boolean,
): boolean {
  return messageDirection(message, ownAgentId, teamChat) === "outgoing";
}

// The peer's own address, when the conversation is with one nameable peer.
//
// A direct's address IS that peer's contacts_addresses address — that is the
// whole of the relationship between the two tables, and it holds on no other
// shape: a group, channel or broadcast addresses an opaque container, and a
// `local` roster addresses members, who are not contacts at all. So this is
// also the question "is there a contact to look up", and asking anywhere else
// is a guaranteed miss.
export function peerAddress(
  conversation?: Pick<
    ConversationRow,
    "type" | "address" | "service" | "extra"
  > | null,
): string | undefined {
  if (!conversation) return undefined;

  if (conversation.service === "local") return undefined;

  return isMultiParty(conversation) ? undefined : conversation.address;
}

// Can a message here have come from more than one party on the peer's side?
//
// That is what earns attribution — an avatar, or a sender name — its space: in
// a 1:1 the peer IS the conversation and repeating their name on every bubble
// says nothing. WhatsApp shows it in groups for exactly this reason, and the
// same reason covers the shapes it has no name for: a Slack mpim (`direct`,
// with `is_multiple` because an opaque channel id cannot show its own arity), a
// channel, and a `local` room whose roster holds more than the two of us.
export function isMultiParty(
  conversation: Pick<ConversationRow, "type" | "address" | "service" | "extra">,
): boolean {
  // group, channel, broadcast — anything that is not a two-person room. Null
  // means "not classified yet" (Slack can create the row before it knows), and
  // the honest answer there is the quiet one.
  if (conversation.type && conversation.type !== "direct") return true;

  if ((conversation.extra as ConversationExtra | null)?.is_multiple)
    return true;

  // A `local` direct's address IS its roster, so it carries its own arity.
  if (conversation.service === "local") {
    return conversation.address.split(":").length > 2;
  }

  return false;
}

// P2-04: crm.templates row, shaped as TemplateData (id = Meta's template id,
// not the table's own uuid PK) plus the local-only fields the API type has
// no equivalent for -- quality and rejection reason come from the status/
// quality webhooks, pack_item_key names which pack template (if any) this
// was submitted from.
export type TemplateRow = TemplateData & {
  quality_score: string | null;
  rejection_reason: string | null;
  pack_item_key: string | null;
};
