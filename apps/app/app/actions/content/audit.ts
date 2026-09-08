import "server-only";

import type { Actor } from "@repo/auth/roles";
import { database } from "@repo/database";

type AuditAction = "create" | "update" | "delete";

/**
 * Records who changed what. Root reads this from /system/logs.
 * Never throws: an audit failure must not roll back the change it describes.
 */
export const recordAudit = async (
  actor: Actor,
  action: AuditAction,
  entity: string,
  entityId: string,
  summary: string
): Promise<void> => {
  try {
    await database.audit_logs.create({
      data: {
        actor_id: actor.id,
        actor_label: actor.label,
        action,
        entity,
        entity_id: entityId,
        summary,
      },
    });
  } catch {
    // Intentionally swallowed - see doc comment.
  }
};
