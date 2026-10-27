import { BudgetUpload } from "./upload";

type PageProps = {
  searchParams: Promise<{ crear?: string }>;
};

export default async function PresupuestosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const creating = params.crear === "1";
  return (
    <main className="panel">
      <h1>{creating ? "Crear evento" : "Presupuesto"}</h1>
      <p className="lede">
        {creating
          ? "El primer paso es el PDF del presupuesto. Después se abre la primera B.E.O. que hay que revisar."
          : "Sube el PDF del presupuesto, digital o escaneado. Si es un escaneo, los datos quedan para validar."}
      </p>
      <BudgetUpload />
    </main>
  );
}
