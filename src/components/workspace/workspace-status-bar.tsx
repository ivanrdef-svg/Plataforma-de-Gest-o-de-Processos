/**
 * Barra inferior de status do Workspace: status, última sincronização,
 * versão e ambiente. Reutilizável por todos os módulos.
 */
export function WorkspaceStatusBar({
  status,
  lastSync,
  version,
  environment,
}: {
  status: string;
  lastSync: string;
  version: string;
  environment: string;
}) {
  const items = [
    { label: "Status", value: status },
    { label: "Última sincronização", value: lastSync },
    { label: "Versão", value: version },
    { label: "Ambiente", value: environment },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="font-medium text-foreground">{status}</span>
      </span>
      {items.slice(1).map((item) => (
        <span key={item.label}>
          {item.label}: <span className="text-foreground/80">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
