import { describe, expect, it } from "vitest";
import { nextFreeNumbers } from "../documents/numbers";
import { compareSnapshots } from "./compare";
import { eventListStatus, searchDateIso, searchEvents, type HistoryEvent } from "./search";

const leti: HistoryEvent = {
  id: "leti",
  title: "MED URO",
  company: "Laboratorios Leti",
  locator: "LOC-LETI",
  dates: ["2026-10-23"],
  beoStatuses: ["generated"],
};

const other: HistoryEvent = {
  id: "otro",
  title: "Congreso",
  company: "Otra empresa",
  locator: "LOC-2",
  dates: ["2026-11-02"],
  beoStatuses: ["draft"],
};

describe("búsqueda del historial", () => {
  it("encuentra MED URO de Laboratorios Leti y muestra el estado generado", () => {
    const found = searchEvents([other, leti], { text: "Leti" });
    expect(found).toEqual([leti]);
    expect(eventListStatus(found[0]?.beoStatuses ?? [])).toBe("generado");
  });

  it("busca por evento, localizador y fecha", () => {
    expect(searchEvents([leti, other], { text: "congreso" }).map((event) => event.id)).toEqual([
      "otro",
    ]);
    expect(searchEvents([leti, other], { text: "loc-leti" }).map((event) => event.id)).toEqual([
      "leti",
    ]);
    expect(searchDateIso("23/10/2026")).toBe("2026-10-23");
    expect(searchEvents([leti, other], { date: "23/10/2026" }).map((event) => event.id)).toEqual([
      "leti",
    ]);
  });

  it("no propone de nuevo un número anulado", () => {
    expect(nextFreeNumbers({ lastNumber: 949, year: 26 }, 1, ["0.950/26"])).toEqual(["0.951/26"]);
  });

  it("pagina y deja en revisión un evento sin emitir", () => {
    const events = Array.from({ length: 3 }, (_, index) => ({
      ...other,
      id: `e${index}`,
      locator: `L-${index}`,
    }));
    expect(searchEvents(events, { page: 2, pageSize: 2 }).map((event) => event.id)).toEqual(["e2"]);
    expect(eventListStatus(["draft"])).toBe("en revisión");
    expect(eventListStatus([])).toBe("en revisión");
  });
});

describe("comparación de versiones", () => {
  it("muestra solo el horario que cambió", () => {
    expect(
      compareSnapshots(
        [
          { key: "schedule", value: "08:00 a 18:00" },
          { key: "salonName", value: "Diamante" },
        ],
        [
          { key: "schedule", value: "09:00 a 12:00" },
          { key: "salonName", value: "Diamante" },
        ],
      ),
    ).toEqual([{ key: "schedule", before: "08:00 a 18:00", after: "09:00 a 12:00" }]);
  });
});
