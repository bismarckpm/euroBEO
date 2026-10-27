import { WizardPage } from "../../wizard-page";

export default async function MemoStepPage({
  params,
}: {
  params: Promise<{ id: string; memoId: string }>;
}) {
  const { id, memoId } = await params;
  return <WizardPage id={id} step={{ kind: "memo", id: memoId }} />;
}
