import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/current-user";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="brand">Eurobuilding</p>
          <strong>Generador de B.E.O.</strong>
        </div>
        <nav>
          <Link href="/">Inicio</Link>
          <Link href="/configuracion">Configuración</Link>
          <Link href="/perfil">Perfil</Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit">Cerrar sesión</button>
          </form>
        </nav>
        <p className="who">{user.name}</p>
      </header>
      {children}
    </div>
  );
}
