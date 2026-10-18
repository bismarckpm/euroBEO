import { requireUser } from "@/lib/current-user";
import { signatureFromProfile } from "@/lib/profile";

export default async function HomePage() {
  const user = await requireUser();
  const signer = signatureFromProfile(user);

  return (
    <main className="panel">
      <h1>Generador de B.E.O.</h1>
      <p>
        Sesión iniciada como <strong>{signer.name}</strong>, {signer.title}.
      </p>
      <p>El nombre y el cargo del perfil se usan como firma de los memorándums.</p>
    </main>
  );
}
