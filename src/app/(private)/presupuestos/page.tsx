import { BudgetUpload } from "./upload";

export default function PresupuestosPage() {
  return (
    <main className="panel">
      <h1>Presupuesto</h1>
      <p className="lede">
        Sube el PDF del presupuesto, digital o escaneado. Si es un escaneo, los datos quedan para
        validar.
      </p>
      <BudgetUpload />
    </main>
  );
}
