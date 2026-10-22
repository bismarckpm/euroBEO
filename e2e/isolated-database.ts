const e2eDatabaseName = "eurobeo_e2e";

function withDatabase(databaseUrl: string, name: string): string {
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.href;
}

/** La suite e2e no usa la base de desarrollo: cada corrida empieza vacía. */
export function isolatedDatabaseUrl(databaseUrl: string): string {
  return withDatabase(databaseUrl, e2eDatabaseName);
}

export function maintenanceDatabaseUrl(databaseUrl: string): string {
  return withDatabase(databaseUrl, "postgres");
}

export function isolatedDatabaseName(): string {
  return e2eDatabaseName;
}
