import { WizardPage } from "../wizard-page";

export default async function GenerarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WizardPage id={id} step={{ kind: "generar" }} />;
}
