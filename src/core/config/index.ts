export { BEO_SECTIONS, SECTION_LABELS, isBeoSection, type BeoSection } from "./sections";
export { normalizeLabel } from "./normalize";
export {
  classifyCatalogItem,
  resolveSalonText,
  resolveSectionHeader,
  type CatalogItemEntry,
  type SalonCatalogEntry,
  type SalonResolution,
  type SectionMappingEntry,
  type SectionResolution,
} from "./resolve";
export {
  formatBeoNumber,
  parseBeoNumber,
  proposeNextBeoNumber,
  type SequenceState,
} from "./sequence";
