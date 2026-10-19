import { BudgetUpload } from "./upload";

export default function PresupuestosPage() {
  return (
    <main className="panel">
      <h1>Presupuesto</h1>
      <p className="lede">
        Sube el PDF digital del presupuesto. Un archivo escaneado, sin capa de texto, no se puede
        leer.
      </p>
      <BudgetUpload />
    </main>
  );
}
