import { WizardPage } from "../wizard-page";

export default async function ArchivosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listo?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <WizardPage id={id} step={{ kind: "archivos" }} announced={query.listo === "1"} />;
}
