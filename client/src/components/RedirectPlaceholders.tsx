import clsx from "clsx";

const placeholderTokens = [
  { token: "{{deviceId}}", label: "Device ID" },
  { token: "{{phone}}", label: "Telefone do usuário" },
  { token: "{{name}}", label: "Nome do usuário" },
  { token: "{{email}}", label: "Email do usuário" },
  { token: "{{date}}", label: "Data atual (pt-BR)" },
  { token: "{{currentDate}}", label: "Data atual (pt-BR)" },
];

type RedirectPlaceholdersProps = {
  className?: string;
};

export default function RedirectPlaceholders({ className }: RedirectPlaceholdersProps) {
  return (
    <p className={clsx("text-xs text-gray-500 mt-1", className)}>
      Variáveis suportadas (podem ficar na query string ou corpo do link). Elas serão substituídas por
      dados reais na hora do redirecionamento:
      <span className="flex flex-wrap gap-2 mt-1">
        {placeholderTokens.map((item) => (
          <code
            key={item.token}
            className="font-mono bg-white border border-gray-300 px-1 py-0.5 rounded-sm text-[11px]"
            title={item.label}
          >
            {item.token}
          </code>
        ))}
      </span>
    </p>
  );
}
