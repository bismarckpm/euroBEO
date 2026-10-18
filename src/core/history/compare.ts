export type SnapshotField = {
  key: string;
  value: string | null;
};

export type FieldChange = {
  key: string;
  before: string | null;
  after: string | null;
};

export function documentSnapshot(input: {
  fields: { key: string; value: string | null }[];
  lines?: { id: string; text: string }[];
}): SnapshotField[] {
  return [
    ...input.fields.map((field) => ({ key: field.key, value: field.value })),
    ...(input.lines ?? []).map((line) => ({ key: `linea:${line.id}`, value: line.text })),
  ];
}

/** Devuelve solo los campos cuyo valor cambió entre dos versiones. */
export function compareSnapshots(
  previous: readonly SnapshotField[],
  next: readonly SnapshotField[],
): FieldChange[] {
  const before = new Map(previous.map((field) => [field.key, field.value]));
  const after = new Map(next.map((field) => [field.key, field.value]));
  const keys = [...new Set([...before.keys(), ...after.keys()])];
  return keys
    .filter((key) => (before.get(key) ?? null) !== (after.get(key) ?? null))
    .map((key) => ({
      key,
      before: before.get(key) ?? null,
      after: after.get(key) ?? null,
    }));
}
