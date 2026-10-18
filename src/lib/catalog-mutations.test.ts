import { describe, expect, it } from "vitest";
import { type AuditEntry, type AuditStore } from "./audit";
import {
  CatalogValidationError,
  createAlias,
  setSequence,
  updateFixedText,
} from "./catalog-mutations";

function memoryAudit(): AuditStore & { rows: AuditEntry[] } {
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

describe("createAlias", () => {
  it("valida, guarda el alias y deja auditoría", async () => {
    const audit = memoryAudit();
    const row = await createAlias(
      { salonId: "s1", label: "Salon Temporal" },
      {
        async salon() {
          return { id: "s1", name: "Plaza Real" };
        },
        async byNormalized() {
          return null;
        },
        async insert(alias) {
          return { id: "a1", ...alias };
        },
      },
      audit,
    );

    expect(row.normalized).toBe("temporal");
    expect(audit.rows[0]).toMatchObject({
      action: "salonAlias.create",
      entity: "SalonAlias",
      entityId: "a1",
    });
  });

  it("rechaza un alias vacío", async () => {
    await expect(
      createAlias(
        { salonId: "s1", label: "   " },
        {
          async salon() {
            return { id: "s1", name: "Plaza Real" };
          },
          async byNormalized() {
            return null;
          },
          async insert() {
            throw new Error("no debe insertar");
          },
        },
      ),
    ).rejects.toBeInstanceOf(CatalogValidationError);
  });
});

describe("updateFixedText", () => {
  it("registra el texto anterior y el nuevo", async () => {
    const audit = memoryAudit();
    await updateFixedText(
      { key: "special_instructions", body: "Texto nuevo" },
      {
        async byKey() {
          return {
            key: "special_instructions",
            label: "Instrucciones especiales",
            body: "Texto anterior",
          };
        },
        async update(key, body) {
          return { key, body };
        },
      },
      audit,
    );
    expect(audit.rows[0]?.before).toEqual({ body: "Texto anterior" });
    expect(audit.rows[0]?.after).toEqual({ body: "Texto nuevo" });
  });
});

describe("setSequence", () => {
  it("guarda 0.947/26 y deja el próximo en 0.948/26", async () => {
    let stored = { lastNumber: 0, year: 26 };
    const audit = memoryAudit();
    const saved = await setSequence(
      { code: "0.947/26" },
      {
        async read() {
          return stored;
        },
        async save(state) {
          stored = state;
        },
      },
      audit,
    );
    expect(saved).toEqual({ lastNumber: 947, year: 26 });
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      action: "sequence.update",
      after: { lastNumber: 947, year: 26 },
    });
  });
});
