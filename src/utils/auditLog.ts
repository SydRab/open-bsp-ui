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
};

/** The filter options of the Activity page: the part of the action before the dot. */
export const AUDIT_AREAS = [
  { value: "organization", label: "Organización" },
  { value: "member", label: "Miembros" },
  { value: "role", label: "Roles" },
  { value: "invitation", label: "Invitaciones" },
  { value: "pack", label: "Pack" },
  { value: "setting", label: "Reglas y módulos" },
  { value: "team", label: "Equipos" },
  { value: "disclaimer", label: "Aviso legal" },
  { value: "custom_field", label: "Campos personalizados" },
] as const;

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  slug: "Identificador (slug)",
  timezone: "Zona horaria",
  locale: "Idioma",
  legal_name: "Razón social",
  address: "Dirección",
  support_email: "Correo de soporte",
  support_phone: "Teléfono de soporte",
  website: "Sitio web",
  registrations: "Números de registro",
};

// Upstream tiers, for invitations made without a crm role.
const TIER_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

const LEAD_SCOPE_LABELS: Record<string, string> = {
  own: "Solo los suyos",
  team: "Su equipo",
  all: "Todos",
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
      return entry.actor_name ?? t("Usuario sin acceso");
    case "api_key":
      return `${t("Clave API")} ${entry.actor_name ?? ""}`.trim();
    case "service":
      return t("Plataforma");
    default:
      return t("Sistema");
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
    return v ? t(LEAD_SCOPE_LABELS[v] ?? v) : t("Según el rol");
  };
  const member = entry.target_name ?? t("un miembro");
  const values = (template: string, extra: Record<string, string> = {}) =>
    fill(t(template), { member, ...extra });

  switch (entry.action) {
    case "organization.created":
      return t("Creó la organización");
    case "organization.profile_updated":
      return values("Cambió el perfil: {changes}", {
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
        ? values("Suspendió la organización: {reason}", {
            reason: text(d.reason),
          })
        : t("Suspendió la organización");
    case "organization.reactivated":
      return t("Reactivó la organización");
    case "organization.deletion_requested":
      return t("Solicitó eliminar la organización");
    case "organization.deletion_cancelled":
      return t("Canceló la eliminación de la organización");
    case "organization.mfa_requirement_changed":
      return d.required
        ? t("Exigió 2FA a propietarios y administradores")
        : t("Dejó de exigir 2FA a propietarios y administradores");

    case "member.joined":
      return values("{member} se unió a la organización");
    case "member.deactivated":
      return values("Desactivó a {member}");
    case "member.reactivated":
      return values("Reactivó a {member}");
    case "member.role_changed":
      return before.role
        ? values("Cambió el rol de {member}: {before} → {after}", {
            before: role(before.role),
            after: role(after.role),
          })
        : values("Asignó a {member} el rol {after}", {
            after: role(after.role),
          });
    case "member.lead_scope_changed":
      return values("Cambió los leads que ve {member}: {before} → {after}", {
        before: scope(before.lead_scope),
        after: scope(after.lead_scope),
      });
    case "member.permission_override_set":
      return values(
        d.granted
          ? "Dio a {member} un permiso extra: {permission}"
          : "Quitó a {member} un permiso: {permission}",
        { permission: permission(d.permission) },
      );
    case "member.permission_override_removed":
      return values("Devolvió a {member} el permiso de su rol: {permission}", {
        permission: permission(d.permission),
      });
    case "member.number_access_granted":
      return values("Dio a {member} acceso a {address}", {
        address: text(d.address),
      });
    case "member.number_access_revoked":
      return values("Quitó a {member} el acceso a {address}", {
        address: text(d.address),
      });

    case "role.permission_granted":
      return values("Activó en {role}: {permission}", {
        role: entry.target_name ? t(entry.target_name) : role(d.role),
        permission: permission(d.permission),
      });
    case "role.permission_revoked":
      return values("Desactivó en {role}: {permission}", {
        role: entry.target_name ? t(entry.target_name) : role(d.role),
        permission: permission(d.permission),
      });

    case "invitation.created":
      return values("Invitó a {email} como {role}", {
        email: text(d.email),
        role: d.role
          ? role(d.role)
          : t(TIER_LABELS[text(d.tier)] ?? text(d.tier)),
      });
    case "invitation.accepted":
      return values("{email} aceptó la invitación", { email: text(d.email) });
    case "invitation.rejected":
      return values("{email} rechazó la invitación", { email: text(d.email) });
    case "invitation.revoked":
      return values("Revocó la invitación de {email}", {
        email: text(d.email),
      });

    case "pack.applied":
      return values("Aplicó el pack {pack} v{version}", {
        pack: text(d.pack),
        version: text(d.version),
      });
    case "pack.upgraded":
      return values("Actualizó el pack {pack}: v{before} → v{after}", {
        pack: text(d.pack),
        before: text(before.version),
        after: text(after.version),
      });
    case "pack.item_updated":
      return values("Editó {key} del pack", { key: text(d.key) });
    case "pack.item_reset":
      return values("Restableció {key} del pack", { key: text(d.key) });

    case "custom_field.created":
      return values("Creó el campo {field}", {
        field: text(d.label) || text(entry.target_id),
      });
    case "custom_field.updated":
      return values("Editó el campo {field}", {
        field:
          text(after.label && (after.label as Record<string, unknown>).en) ||
          text(entry.target_id),
      });
    case "custom_field.archived":
      return values("Archivó el campo {field}", {
        field: text(entry.target_id),
      });
    case "custom_field.restored":
      return values("Restauró el campo {field}", {
        field: text(entry.target_id),
      });

    case "disclaimer.updated":
      return values(
        "Cambió el aviso {kind} ({locale}) a la versión {version}: «{after}»",
        {
          kind: d.kind === "full" ? t("completo") : t("corto"),
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
          ? ` (${t("equipo")})`
          : d.scope === "user"
            ? ` (${t("personal")})`
            : "";
      return entry.action === "setting.reset"
        ? values("Restableció {setting}", { setting: name + scope })
        : values("Cambió {setting}: {before} → {after}", {
            setting: name + scope,
            // No before: the value came from a lower layer (pack or default).
            before:
              d.before === undefined
                ? t("predeterminado")
                : formatSettingValue(d.before, t),
            after: formatSettingValue(d.after, t),
          });
    }

    case "team.created":
      return values("Creó el equipo {team}", { team: text(d.name) });
    case "team.renamed":
      return values("Renombró el equipo {before} → {after}", {
        before: text(before.name),
        after: text(after.name),
      });
    case "team.deleted":
      return values("Eliminó el equipo {team}", { team: text(d.name) });
    case "team.member_added":
      return values("Añadió a {member} al equipo {team}", {
        team: text(d.team),
      });
    case "team.member_removed":
      return values("Quitó a {member} del equipo {team}", {
        team: text(d.team),
      });

    default:
      // An action this version of the UI does not know yet.
      return entry.action;
  }
}
