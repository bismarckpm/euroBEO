import { WizardPage } from "../../wizard-page";

export default async function BeoStepPage({
  params,
}: {
  params: Promise<{ id: string; beoId: string }>;
}) {
  const { id, beoId } = await params;
  return <WizardPage id={id} step={{ kind: "beo", id: beoId }} />;
}
