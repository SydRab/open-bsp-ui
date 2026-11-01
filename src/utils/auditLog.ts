// [crm] Turns audit log entries (P1-08) into the sentences the Activity page
// shows. Sentences are translation keys with {placeholders}, so each language
// can put the names where its grammar wants them.
import type { AuditEntry } from "@/queries/useCrm";
import { formatSettingValue } from "@/utils/settings";

type Translate = (text: string) => string;

export type AuditLookups = {
  /** Role key → display name. */
  roleNames: Map<string, string>;
  /** Permission key → description. */
  permissionNames: Map<string, string>;
  /** Setting key → label. */
  settingNames: Map<string, string>;
  /** Feature key → label. */
  featureNames: Map<string, string>;
  // [crm] P3-07c: only the lead-history modal passes these (the org-wide
  // Activity page has no stage/quality data loaded) -- default to "—".
  /** Lead stage id → name. */
  stageNames?: Map<string, string>;
  /** Lead quality id → name. */
  qualityNames?: Map<string, string>;
  /** Agent id → name (for lead assignment entries). */
  agentNames?: Map<string, string>;
};

/** The filter options of the Activity page: the part of the action before the dot. */
export const AUDIT_AREAS = [
  { value: "organization", label: "Organization" },
  { value: "member", label: "Members" },
  { value: "role", label: "Roles" },
  { value: "invitation", label: "Invitations" },
  { value: "pack", label: "Pack" },
  { value: "setting", label: "Rules & modules" },
  { value: "team", label: "Teams" },
  { value: "disclaimer", label: "Disclaimer" },
  { value: "custom_field", label: "Custom fields" },
  { value: "feature", label: "Plan & features" },
] as const;

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  slug: "Identifier (slug)",
  timezone: "Time zone",
  locale: "Language",
  legal_name: "Legal name",
  address: "Address",
  support_email: "Support email",
  support_phone: "Support phone",
  website: "Website",
  registrations: "Registration numbers",
};

// Upstream tiers, for invitations made without a crm role.
const TIER_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  member: "Member",
};

const LEAD_SCOPE_LABELS: Record<string, string> = {
  own: "Only their own",
  team: "Their team",
  all: "All",
};

// [crm] P3-07d/P3-08: how a reminder was actually delivered.
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  in_app: "in-app",
  none: "no approved template",
  skipped_past_due: "skipped (already past)",
};

function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function field(details: Record<string, unknown>, side: "before" | "after") {
  const value = details[side];
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Who acted, as the page shows it. */
export function describeActor(entry: AuditEntry, t: Translate): string {
  switch (entry.actor_type) {
    case "user":
      return entry.actor_name ?? t("Former user");
    case "api_key":
      return `${t("API Key")} ${entry.actor_name ?? ""}`.trim();
    case "service":
      return t("Platform");
    default:
      return t("System");
  }
}

/** What happened, as one sentence. */
export function describeAction(
  entry: AuditEntry,
  t: Translate,
  lookups: AuditLookups,
): string {
  const d = entry.details ?? {};
  const before = field(d, "before");
  const after = field(d, "after");

  const role = (key: unknown) => {
    const k = text(key);
    return k ? t(lookups.roleNames.get(k) ?? k) : "—";
  };
  const permission = (key: unknown) => {
    const k = text(key);
    return t(lookups.permissionNames.get(k) ?? k);
  };
  const scope = (value: unknown) => {
    const v = text(value);
    return v ? t(LEAD_SCOPE_LABELS[v] ?? v) : t("Role default");
  };
  const member = entry.target_name ?? t("a member");
  const values = (template: string, extra: Record<string, string> = {}) =>
    fill(t(template), { member, ...extra });
  // [crm] P3-07c
  const stageName = (id: unknown) => {
    const k = text(id);
    return k ? (lookups.stageNames?.get(k) ?? t("a stage")) : t("no stage");
  };
  const qualityName = (id: unknown) => {
    const k = text(id);
    return k
      ? (lookups.qualityNames?.get(k) ?? t("a quality"))
      : t("unqualified");
  };
  const agentName = (id: unknown) => {
    const k = text(id);
    return k ? (lookups.agentNames?.get(k) ?? t("someone")) : t("nobody");
  };

  switch (entry.action) {
    case "organization.created":
      return t("Created the organization");
    case "organization.profile_updated":
      return values("Changed the profile: {changes}", {
        changes: Object.keys(after)
          .map((k) =>
            // Address and registrations are lists: name the field only.
            typeof after[k] === "object" && after[k] !== null
              ? t(FIELD_LABELS[k] ?? k)
              : `${t(FIELD_LABELS[k] ?? k)} ${text(before[k]) || "—"} → ${text(after[k]) || "—"}`,
          )
          .join(", "),
      });
    case "organization.suspended":
      return d.reason
        ? values("Suspended the organization: {reason}", {
            reason: text(d.reason),
          })
        : t("Suspended the organization");
    case "organization.reactivated":
      return t("Reactivated the organization");
    case "organization.deletion_requested":
      return t("Requested deletion of the organization");
    case "organization.deletion_cancelled":
      return t("Cancelled the organization's deletion");
    case "organization.mfa_requirement_changed":
      return d.required
        ? t("Required 2FA for owners and admins")
        : t("Stopped requiring 2FA for owners and admins");

    case "member.joined":
      return values("{member} joined the organization");
    case "member.deactivated":
      return values("Deactivated {member}");
    case "member.reactivated":
      return values("Reactivated {member}");
    case "member.role_changed":
      return before.role
        ? values("Changed {member}'s role: {before} → {after}", {
            before: role(before.role),
            after: role(after.role),
          })
        : values("Gave {member} the {after} role", {
            after: role(after.role),
          });
    case "member.lead_scope_changed":
      return values("Changed which leads {member} sees: {before} → {after}", {
        before: scope(before.lead_scope),
        after: scope(after.lead_scope),
      });
    case "member.permission_override_set":
      return values(
        d.granted
          ? "Gave {member} an extra permission: {permission}"
          : "Took a permission from {member}: {permission}",
        { permission: permission(d.permission) },
      );
    case "member.permission_override_removed":
      return values("Reset {member} to their role's setting: {permission}", {
        permission: permission(d.permission),
      });
    case "member.number_access_granted":
      return values("Gave {member} access to {address}", {
        address: text(d.address),
      });
    case "member.number_access_revoked":
      return values("Removed {member}'s access to {address}", {
        address: text(d.address),
      });

    case "role.permission_granted":
      return values("Turned on for {role}: {permission}", {
        role: entry.target_name ? t(entry.target_name) : role(d.role),
        permission: permission(d.permission),
      });
    case "role.permission_revoked":
      return values("Turned off for {role}: {permission}", {
        role: entry.target_name ? t(entry.target_name) : role(d.role),
        permission: permission(d.permission),
      });

    case "invitation.created":
      return values("Invited {email} as {role}", {
        email: text(d.email),
        role: d.role
          ? role(d.role)
          : t(TIER_LABELS[text(d.tier)] ?? text(d.tier)),
      });
    case "invitation.accepted":
      return values("{email} accepted the invitation", {
        email: text(d.email),
      });
    case "invitation.rejected":
      return values("{email} declined the invitation", {
        email: text(d.email),
      });
    case "invitation.revoked":
      return values("Revoked {email}'s invitation", {
        email: text(d.email),
      });

    case "pack.applied":
      return values("Applied the {pack} pack v{version}", {
        pack: text(d.pack),
        version: text(d.version),
      });
    case "pack.upgraded":
      return values("Upgraded the {pack} pack: v{before} → v{after}", {
        pack: text(d.pack),
        before: text(before.version),
        after: text(after.version),
      });
    case "pack.item_updated":
      return values("Edited pack item {key}", { key: text(d.key) });
    case "pack.item_reset":
      return values("Reset pack item {key}", { key: text(d.key) });

    case "custom_field.created":
      return values("Created the field {field}", {
        field: text(d.label) || text(entry.target_id),
      });
    case "custom_field.updated":
      return values("Edited the field {field}", {
        field:
          text(after.label && (after.label as Record<string, unknown>).en) ||
          text(entry.target_id),
      });
    case "custom_field.archived":
      return values("Archived the field {field}", {
        field: text(entry.target_id),
      });
    case "custom_field.restored":
      return values("Restored the field {field}", {
        field: text(entry.target_id),
      });

    case "feature.override_set": {
      const name = t(
        lookups.featureNames.get(entry.target_id ?? "") ??
          text(entry.target_id),
      );
      return d.enabled
        ? values("Enabled {feature} for this organization", { feature: name })
        : values("Disabled {feature} for this organization", {
            feature: name,
          });
    }
    case "feature.override_cleared":
      return values(
        "Removed the {feature} override; the plan's default applies",
        {
          feature: t(
            lookups.featureNames.get(entry.target_id ?? "") ??
              text(entry.target_id),
          ),
        },
      );

    case "disclaimer.updated":
      return values(
        "Changed the {kind} disclaimer ({locale}) to version {version}: “{after}”",
        {
          kind: d.kind === "full" ? t("full") : t("short"),
          locale: text(d.locale).toUpperCase(),
          version: text(d.version),
          after: text(d.after),
        },
      );

    case "setting.changed":
    case "setting.reset": {
      const name = t(lookups.settingNames.get(text(d.key)) ?? text(d.key));
      const scope =
        d.scope === "team"
          ? ` (${t("team")})`
          : d.scope === "user"
            ? ` (${t("personal")})`
            : "";
      return entry.action === "setting.reset"
        ? values("Reset {setting}", { setting: name + scope })
        : values("Changed {setting}: {before} → {after}", {
            setting: name + scope,
            // No before: the value came from a lower layer (pack or default).
            before:
              d.before === undefined
                ? t("default")
                : formatSettingValue(d.before, t),
            after: formatSettingValue(d.after, t),
          });
    }

    case "team.created":
      return values("Created the team {team}", { team: text(d.name) });
    case "team.renamed":
      return values("Renamed the team {before} → {after}", {
        before: text(before.name),
        after: text(after.name),
      });
    case "team.deleted":
      return values("Deleted the team {team}", { team: text(d.name) });
    case "team.member_added":
      return values("Added {member} to the team {team}", {
        team: text(d.team),
      });
    case "team.member_removed":
      return values("Removed {member} from the team {team}", {
        team: text(d.team),
      });

    // [crm] P3-07c: lead actions have existed since P3-02 but were never
    // rendered meaningfully anywhere until the per-lead history modal --
    // the general Activity page also benefits (it fell back to the raw
    // action string before).
    case "lead.created":
      return values("The lead was created ({source})", {
        source: text(d.source),
      });
    case "lead.reopened":
      return t("The lead was reopened");
    case "lead.stage_changed":
      return values("Stage changed: {stage}", {
        stage: t(stageName(d.stage_id)),
      });
    case "lead.quality_changed":
      return values("Quality changed: {quality}", {
        quality: t(qualityName(d.quality_id)),
      });
    case "lead.status_changed":
      return values("Status changed: {before} → {after}", {
        before: text(d.from_status),
        after: text(d.to_status),
      });
    case "lead.deal_value_changed":
      return d.deal_value
        ? values("Set the deal value to {value}", { value: text(d.deal_value) })
        : t("Cleared the deal value");
    case "lead.assigned":
      return values("Assigned to {agent}", { agent: agentName(d.agent_id) });
    case "lead.reassigned":
      return values("Reassigned: {before} → {after}", {
        before: agentName(d.from_agent_id),
        after: agentName(d.agent_id),
      });
    case "lead.unassigned":
      return t("Assignment removed");
    case "lead.first_responded":
      return values("First response in {minutes} min", {
        minutes: text(d.minutes_to_respond),
      });
    case "lead.sla_breached":
      return t("First-response SLA breached");
    case "lead.escalated_to_manager":
      return t("Managers were notified for lack of response");
    case "lead.auto_reassigned_sla":
      return values("Auto-reassigned (was with {agent})", {
        agent: agentName(d.from_agent_id),
      });
    case "lead.qualification_started":
      return t("Qualification started");
    case "lead.answer_recorded":
      return values("Answered: {field}", { field: text(d.field) });
    case "lead.qualification_completed":
      return values("Qualification finished (score {score})", {
        score: text(d.score),
      });

    // [crm] P3-07d: these have existed since P3-07d but were never added
    // here -- same gap P3-07c's own comment above already fixed once for
    // an earlier batch of lead actions.
    case "lead.task_created":
      return values("Created the task: {title}", { title: text(d.title) });
    case "lead.task_completed":
      return values("Completed the task: {title}", { title: text(d.title) });
    case "lead.task_reopened":
      return values("Reopened the task: {title}", { title: text(d.title) });
    case "lead.task_reminder_sent":
      return values("Sent the task reminder ({channel})", {
        channel: t(CHANNEL_LABELS[text(d.channel)] ?? text(d.channel)),
      });

    // [crm] P3-07e
    case "lead.note_created":
      return t("Added a note");
    case "lead.note_updated":
      return t("Edited a note");
    case "lead.note_deleted":
      return t("Deleted a note");

    // [crm] P3-08
    case "lead.trial_offered":
      return values("Offered trial-class slots ({count})", {
        count: text(d.slot_count),
      });
    case "lead.trial_booked":
      return values("Booked the trial class: {slot}", {
        slot: text(d.slot_start),
      });
    case "lead.trial_rescheduled":
      return values("Rescheduled the trial class: {slot}", {
        slot: text(d.slot_start),
      });
    case "lead.trial_cancelled":
      return t("Cancelled the trial-class booking");
    case "lead.trial_reminder_sent":
      return values("Sent the trial-class reminder ({channel})", {
        channel: t(CHANNEL_LABELS[text(d.channel)] ?? text(d.channel)),
      });

    default:
      // An action this version of the UI does not know yet.
      return entry.action;
  }
}
