export type FieldStatus = "RULE" | "PENDING";

export type Tracked<T> = {
  value: T;
  status: FieldStatus;
};

export type BlockKind = "MONTAJE" | "EVENTO" | "DESMONTAJE" | "OTRO";

export type BudgetHeader = {
  locator: string | null;
  issuedOn: string | null;
  checkIn: string | null;
  checkOut: string | null;
  executive: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
};

export type BudgetClient = {
  company: string | null;
  contact: string | null;
  phones: string | null;
  address: string | null;
  email: string | null;
  rif: string | null;
};

export type BudgetItem = {
  qty: number;
  description: string;
  nights: number;
  unitPrice: number | null;
  total: number | null;
  flags: string[];
  section: Tracked<string | null>;
};

export type BudgetSection = {
  headerRaw: string;
  target: Tracked<string | null>;
  items: BudgetItem[];
};

export type BudgetRent = {
  regular: number | null;
  net: number | null;
  discountLabel: string | null;
  courtesy: boolean;
};

export type BudgetBlock = {
  kind: BlockKind;
  rawTitle: string;
  salonRaw: string | null;
  salon: Tracked<string | null>;
  schedule: Tracked<string | null>;
  setup: Tracked<string | null>;
  pax: Tracked<number | null>;
  nights: number | null;
  rent: BudgetRent;
  sections: BudgetSection[];
  page: number;
};

export type BudgetDay = {
  dates: string[];
  raw: string;
  blocks: BudgetBlock[];
};

export type BudgetTotals = {
  subtotal: number | null;
  iva: number | null;
  logistics: number | null;
  general: number | null;
  igtf: number | null;
  payable: number | null;
};

export type StructureError = {
  page: number;
  section: string;
  message: string;
};

export type ReconciliationLine = {
  description: string;
  total: number;
};

export type Reconciliation = {
  expected: number | null;
  actual: number;
  difference: number | null;
  lines: ReconciliationLine[];
  ok: boolean;
};

export type ParsedBudget = {
  header: BudgetHeader;
  client: BudgetClient;
  eventTitle: string | null;
  days: BudgetDay[];
  totals: BudgetTotals;
  benefits: string[];
  triggers: string[];
  warnings: string[];
  structureErrors: StructureError[];
  reconciliation: Reconciliation;
};

export function tracked<T>(value: T, status: FieldStatus): Tracked<T> {
  return { value, status };
}

export function emptyHeader(): BudgetHeader {
  return {
    locator: null,
    issuedOn: null,
    checkIn: null,
    checkOut: null,
    executive: null,
    role: null,
    email: null,
    phone: null,
  };
}

export function emptyClient(): BudgetClient {
  return {
    company: null,
    contact: null,
    phones: null,
    address: null,
    email: null,
    rif: null,
  };
}
