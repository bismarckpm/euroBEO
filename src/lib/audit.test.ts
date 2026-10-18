import { describe, expect, it } from "vitest";
import { recordAudit, type AuditEntry, type AuditStore } from "./audit";

function memoryStore(): AuditStore & { rows: AuditEntry[] } {
  const rows: AuditEntry[] = [];
  return {
    rows,
    async insert(entry) {
      const row: AuditEntry = {
        id: `audit-${rows.length + 1}`,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before,
        after: entry.after,
        createdAt: entry.createdAt,
      };
      rows.push(row);
      return row;
    },
  };
}

describe("recordAudit", () => {
  it("guarda el valor anterior, el valor nuevo y la fecha", async () => {
    const store = memoryStore();
    const before = Date.now();
    const row = await recordAudit(
      {
        action: "profile.update",
        entity: "User",
        entityId: "user-1",
        before: { title: "Asistente de Ventas" },
        after: { title: "Coordinadora de Ventas" },
      },
      store,
    );

    expect(store.rows).toHaveLength(1);
    expect(row.before).toEqual({ title: "Asistente de Ventas" });
    expect(row.after).toEqual({ title: "Coordinadora de Ventas" });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
