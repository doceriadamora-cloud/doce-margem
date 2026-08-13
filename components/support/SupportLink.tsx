import { buildSupportWhatsAppUrl } from "@/lib/support";

/**
 * CTA de suporte — Fase P0-8A.
 *
 * Server Component: é só uma âncora, não precisa de JavaScript no cliente.
 * Toda a decisão de canal mora em `lib/support.ts`; aqui só existe aparência.
 *
 * `target="_blank"` com `rel="noopener noreferrer"` para a usuária não perder a
 * tela em que estava — em especial no meio do fluxo de senha, onde voltar ao
 * ponto certo seria trabalhoso.
 */

type SupportLinkVariant = "button" | "inline" | "quiet";

const VARIANT_CLASS: Record<SupportLinkVariant, string> = {
  button:
    "inline-flex w-fit items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
  inline:
    "inline-flex w-fit items-center rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800",
  quiet:
    "font-medium text-rose-600 underline-offset-2 hover:underline dark:text-rose-400",
};

interface SupportLinkProps {
  /** Texto do CTA. Padrão pensado para quem está travada no acesso. */
  label?: string;
  /** Mensagem já preenchida no WhatsApp. Omitir usa a mensagem padrão. */
  message?: string;
  variant?: SupportLinkVariant;
  className?: string;
}

export default function SupportLink({
  label = "Falar com suporte no WhatsApp",
  message,
  variant = "inline",
  className = "",
}: SupportLinkProps) {
  const href = message === undefined ? buildSupportWhatsAppUrl() : buildSupportWhatsAppUrl(message);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
    >
      {label}
    </a>
  );
}
