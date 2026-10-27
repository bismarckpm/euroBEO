import { WizardPage } from "../wizard-page";

export default async function DatosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WizardPage id={id} step={{ kind: "datos" }} />;
}
