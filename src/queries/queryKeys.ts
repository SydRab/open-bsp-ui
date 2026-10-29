type NullableId = string | null | undefined;

/**
 * Detail queries cache the raw Supabase response and unwrap it with `select`,
 * so a mutation has to merge the fresh row into that wrapper — writing a bare
 * row would make `select` read `undefined`.
 */
export type CachedResponse<T> = { data: T; error: null };

export const queryKeys = {
  agents: {
    all: (orgId: NullableId) => [orgId, "agents"] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "agents", id] as const,
    current: (orgId: NullableId) => [orgId, "agents", "current"] as const,
  },
  invitations: {
    mine: () => ["invitations", "mine"] as const,
    all: (orgId: NullableId) => [orgId, "invitations"] as const,
  },
  apiKeys: {
    all: (orgId: NullableId) => [orgId, "api_keys"] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "api_keys", id] as const,
  },
  contacts: {
    all: (orgId: NullableId) => [orgId, "contacts_addresses"] as const,
    // contacts_addresses PK is (organization_id, organization_address,
    // service, address): an entry belongs to ONE connection's address book,
    // and the same phone digits may exist under whatsapp AND whatsapp-web.
    addressDetail: (
      orgId: NullableId,
      orgAddress: NullableId,
      service: NullableId,
      address: NullableId,
    ) => [orgId, "contacts_addresses", orgAddress, service, address] as const,
  },
  organizations: {
    all: () => ["organizations"] as const,
    detail: (id: NullableId) => ["organizations", id] as const,
    addresses: (orgId: NullableId) =>
      [orgId, "organizations_addresses"] as const,
    addressDetail: (orgId: NullableId, address: NullableId) =>
      [orgId, "organizations_addresses", address] as const,
  },
  // [crm] P2-11
  whatsapp: {
    businessProfile: (orgId: NullableId, address: NullableId) =>
      [orgId, "whatsapp_business_profile", address] as const,
  },
  webhooks: {
    all: (orgId: NullableId) => [orgId, "webhooks"] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "webhooks", id] as const,
  },
  onboardingTokens: {
    all: (orgId: NullableId, service: string) =>
      [orgId, "onboarding_tokens", service] as const,
  },
  whatsappWeb: {
    pendingSession: (orgId: NullableId, sessionId: NullableId) =>
      [orgId, "whatsapp_web", "pending_session", sessionId] as const,
    health: (orgId: NullableId, address: NullableId) =>
      [orgId, "whatsapp_web", "health", address] as const,
  },
  // [crm] Our CRM layer (schema `crm`).
  crm: {
    all: () => ["crm"] as const,
    profile: (orgId: NullableId) => ["crm", orgId, "profile"] as const,
    statuses: (userId: NullableId) => ["crm", "statuses", userId] as const,
    myInvitationRoles: (userId: NullableId) =>
      ["crm", "my_invitation_roles", userId] as const,
    // Prefix, for invalidating every user's cached permissions in an org.
    myPermissionsAll: (orgId: NullableId) =>
      ["crm", orgId, "my_permissions"] as const,
    myPermissions: (orgId: NullableId, userId: NullableId) =>
      ["crm", orgId, "my_permissions", userId] as const,
    roles: (orgId: NullableId) => ["crm", orgId, "roles"] as const,
    catalog: () => ["crm", "permissions"] as const,
    memberRoles: (orgId: NullableId) => ["crm", orgId, "member_roles"] as const,
    // [crm] P2-12
    memberAddressAccess: (agentId: NullableId) =>
      ["crm", "member_address_access", agentId] as const,
    invitationRoles: (orgId: NullableId) =>
      ["crm", orgId, "invitation_roles"] as const,
    settings: (orgId: NullableId) => ["crm", orgId, "settings"] as const,
    disclaimers: (orgId: NullableId) => ["crm", orgId, "disclaimers"] as const,
    disclaimerPreview: (
      orgId: NullableId,
      contentType: string,
      locale: string,
      text: string,
    ) =>
      [
        "crm",
        orgId,
        "disclaimers",
        "preview",
        contentType,
        locale,
        text,
      ] as const,
    customFields: (orgId: NullableId) =>
      ["crm", orgId, "custom_fields"] as const,
    // [crm] P2-09b
    tags: (orgId: NullableId) => ["crm", orgId, "tags"] as const,
    conversationTags: (conversationId: NullableId) =>
      ["crm", "conversation_tags", conversationId] as const,
    // [crm] P2-09c
    conversationAssignment: (conversationId: NullableId) =>
      ["crm", "conversation_assignments", conversationId] as const,
    // [crm] P2-09e
    cannedReplies: (orgId: NullableId) =>
      ["crm", orgId, "canned_replies"] as const,
    contactByAddress: (orgId: NullableId, service: string, address: string) =>
      ["crm", orgId, "contact", service, address] as const,
    disclaimerTemplates: (orgId: NullableId) =>
      ["crm", orgId, "disclaimer_templates"] as const,
    features: (orgId: NullableId) => ["crm", orgId, "features"] as const,
    featureCatalog: () => ["crm", "feature_catalog"] as const,
    auditLog: (
      orgId: NullableId,
      filters: { area: string; actor: string; days: string },
    ) => ["crm", orgId, "audit_log", filters] as const,
    needsMfaStepUp: (orgId: NullableId) =>
      ["crm", orgId, "needs_mfa_step_up"] as const,
    // [crm] P3-06
    notifications: (orgId: NullableId, agentId: NullableId) =>
      ["crm", orgId, "notifications", agentId] as const,
    unansweredLeads: (orgId: NullableId) =>
      ["crm", orgId, "unanswered_leads"] as const,
    // [crm] P3-07a
    leadStages: (orgId: NullableId) => ["crm", orgId, "lead_stages"] as const,
    leadQualities: (orgId: NullableId) =>
      ["crm", orgId, "lead_qualities"] as const,
    pipelineLeads: (orgId: NullableId) =>
      ["crm", orgId, "pipeline_leads"] as const,
    // [crm] P3-07b
    leadDropReasons: (orgId: NullableId) =>
      ["crm", orgId, "lead_drop_reasons"] as const,
    stageRequiredFields: (orgId: NullableId) =>
      ["crm", orgId, "lead_stage_required_fields"] as const,
    // [crm] P3-07c
    leadHistory: (leadId: NullableId) =>
      ["crm", "lead_history", leadId] as const,
  },
  // [crm] Super-admin console (P1-10) — platform-wide, not scoped to the
  // active org, so no orgId prefix (except tenant-specific lookups).
  admin: {
    all: () => ["admin"] as const,
    isPlatformAdmin: () => ["admin", "is_platform_admin"] as const,
    tenants: (search: string) => ["admin", "tenants", search] as const,
    supportAccess: (orgId: NullableId) =>
      ["admin", "support_access", orgId ?? null] as const,
    tenantConfig: (orgId: NullableId) =>
      ["admin", "tenant_config", orgId] as const,
    tenantAuditLog: (orgId: NullableId) =>
      ["admin", "tenant_audit_log", orgId] as const,
    platformAdmins: () => ["admin", "platform_admins"] as const,
    platformAuditLog: () => ["admin", "platform_audit_log"] as const,
  },
  billing: {
    products: () => ["billing", "products"] as const,
    tiers: () => ["billing", "tiers"] as const,
    usage: (orgId: NullableId, interval: string) =>
      [orgId, "billing", "usage", interval] as const,
    subscription: (orgId: NullableId) =>
      [orgId, "billing", "subscription"] as const,
    tierLimits: (orgId: NullableId) =>
      [orgId, "billing", "tier_limits"] as const,
    planProducts: (orgId: NullableId) =>
      [orgId, "billing", "plan_products"] as const,
  },
};
