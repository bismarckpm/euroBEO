import { isBlockHeaderKind, seedBlockHeaderEntries } from "../core/config/block-headers";
import { isBeoSection } from "../core/config/sections";
import type { BudgetCatalog } from "../core/budget/parse-budget";
import { listItems, listMappings, listMemos, listSalons } from "./catalog-db";

export async function loadBudgetCatalog(): Promise<BudgetCatalog> {
  const [salons, mappings, items, memos] = await Promise.all([
    listSalons(),
    listMappings(),
    listItems(),
    listMemos(),
  ]);

  const blockHeaders = mappings.flatMap((mapping) =>
    isBlockHeaderKind(mapping.section)
      ? [{ normalized: mapping.normalized, kind: mapping.section }]
      : [],
  );

  return {
    salons: salons.map((salon) => ({
      id: salon.id,
      name: salon.name,
      aliases: salon.aliases.map((alias) => ({ normalized: alias.normalized })),
    })),
    mappings: mappings.flatMap((mapping) =>
      isBeoSection(mapping.section)
        ? [{ normalized: mapping.normalized, section: mapping.section }]
        : [],
    ),
    blockHeaders: blockHeaders.length > 0 ? blockHeaders : seedBlockHeaderEntries(),
    items: items.flatMap((item) =>
      isBeoSection(item.section) ? [{ normalized: item.normalized, section: item.section }] : [],
    ),
    keywords: memos.flatMap((memo) => memo.keywords),
  };
}
