"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteEventButton({
  id,
  company,
  title,
}: {
  id: string;
  company: string;
  title: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const confirmed = window.confirm(
      `¿Eliminar el evento de ${company}, ${title}? Se borra de la base de datos y los archivos generados. Los números ya emitidos no se reutilizan y las copias en Drive se quedan.`,
    );
    if (!confirmed) return;
    setError(null);
    const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message ?? "No se pudo eliminar el evento.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => void remove()}>
        Eliminar
      </button>
      {error ? <span className="alert">{error}</span> : null}
    </>
  );
}
