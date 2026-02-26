import { useParams } from "react-router-dom";

const categoryLabels: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps & Infra",
  security: "Segurança & Criptografia",
};

export function VaultListPage() {
  const { category } = useParams<{ category: string }>();
  const label = category ? categoryLabels[category] ?? category : "Todos";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Cofre Global — {label}</h1>
      <p className="text-muted-foreground mt-1">Seus módulos reutilizáveis de código.</p>
    </div>
  );
}
