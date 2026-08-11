"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  getQuoteIdentityServerSnapshot,
  getQuoteIdentitySnapshot,
  subscribeQuoteIdentity,
  updateQuoteIdentity,
} from "@/components/quotes/quote-identity-store";
import {
  createQuoteColorTheme,
  MAX_LOGO_FILE_SIZE_LABEL,
  normalizeHexColor,
  processQuoteLogo,
} from "@/components/quotes/quote-identity-utils";
import type { QuoteIdentity } from "@/types/quotes";

type Message = { type: "success" | "error"; text: string };

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:ring-rose-950";

export default function QuoteIdentityForm() {
  const identity = useSyncExternalStore(
    subscribeQuoteIdentity,
    getQuoteIdentitySnapshot,
    getQuoteIdentityServerSnapshot,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const theme = createQuoteColorTheme(identity.primaryColor, identity.secondaryColor);
  const displayBrandName = identity.brandName.trim() || "Minha Fatia";

  function persist(values: Partial<Omit<QuoteIdentity, "updatedAt">>): boolean {
    const persisted = updateQuoteIdentity(values);
    if (!persisted) {
      setMessage({
        type: "error",
        text: "O navegador não conseguiu salvar a identidade. Confira se o armazenamento local está liberado e tem espaço.",
      });
    }
    return persisted;
  }

  function updateText(
    field: keyof Pick<
      QuoteIdentity,
      | "brandName"
      | "whatsapp"
      | "instagram"
      | "email"
      | "address"
      | "defaultCommercialTerms"
    >,
    value: string,
  ): void {
    setMessage(null);
    persist({ [field]: value });
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage(null);
    setIsProcessingLogo(true);
    try {
      const processed = await processQuoteLogo(file);
      const persisted = persist({
        logoDataUrl: processed.dataUrl,
        ...(processed.suggestedColors ?? {}),
      });
      if (persisted) {
        setMessage({
          type: "success",
          text: processed.suggestedColors
            ? "Logo otimizada e salva. As cores foram sugeridas a partir da imagem e podem ser ajustadas abaixo."
            : "Logo otimizada e salva. Não encontramos cores úteis na imagem, então mantivemos a paleta atual.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Não foi possível processar a logo.",
      });
    } finally {
      setIsProcessingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveLogo(): void {
    setMessage(null);
    if (persist({ logoDataUrl: null })) {
      setMessage({
        type: "success",
        text: "Logo removida. O orçamento continuará com o nome da marca ou o fallback Minha Fatia.",
      });
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-50">
              Marca e logo
            </h3>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Estes dados aparecem somente no documento comercial enviado ao cliente.
              Alterações são salvas automaticamente neste navegador.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <Field label="Nome da marca">
              <input
                type="text"
                maxLength={120}
                value={identity.brandName}
                onChange={(event) => updateText("brandName", event.target.value)}
                placeholder="Ex.: Doces da Ana"
                className={inputClass}
              />
            </Field>

            <div>
              <label className="flex flex-col gap-1 text-sm" htmlFor="quote-logo">
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  Logo da marca
                </span>
                <input
                  ref={fileInputRef}
                  id="quote-logo"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  disabled={isProcessingLogo}
                  onChange={(event) => void handleLogoChange(event)}
                  aria-describedby="quote-logo-help"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:cursor-wait disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:file:bg-stone-800 dark:file:text-stone-200 dark:focus:ring-rose-950"
                />
              </label>
              <p id="quote-logo-help" className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                PNG, JPG/JPEG ou WEBP, até {MAX_LOGO_FILE_SIZE_LABEL}. A imagem é
                redimensionada e compactada antes de ser salva.
              </p>
              {identity.logoDataUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-stone-200 bg-white p-2">
                    <Image
                      unoptimized
                      src={identity.logoDataUrl}
                      alt={`Logo de ${displayBrandName}`}
                      width={320}
                      height={160}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    Remover logo
                  </button>
                </div>
              )}
              {isProcessingLogo && (
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300" role="status">
                  Otimizando logo e analisando cores…
                </p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                Cores do orçamento
              </h4>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Ao enviar uma logo, sugerimos duas cores. Você pode editar ambas manualmente.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <ColorField
                  key={`primary-${identity.primaryColor}`}
                  id="quote-primary-color"
                  label="Cor principal"
                  value={identity.primaryColor}
                  onCommit={(primaryColor) => {
                    setMessage(null);
                    persist({ primaryColor });
                  }}
                />
                <ColorField
                  key={`secondary-${identity.secondaryColor}`}
                  id="quote-secondary-color"
                  label="Cor secundária"
                  value={identity.secondaryColor}
                  onCommit={(secondaryColor) => {
                    setMessage(null);
                    persist({ secondaryColor });
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-stone-900 dark:text-stone-50">
                Contatos comerciais
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp">
                  <input
                    type="tel"
                    maxLength={60}
                    value={identity.whatsapp}
                    onChange={(event) => updateText("whatsapp", event.target.value)}
                    placeholder="Ex.: (11) 99999-9999"
                    className={inputClass}
                  />
                </Field>
                <Field label="Instagram (opcional)">
                  <input
                    type="text"
                    maxLength={80}
                    value={identity.instagram}
                    onChange={(event) => updateText("instagram", event.target.value)}
                    placeholder="Ex.: @docesdaana"
                    className={inputClass}
                  />
                </Field>
                <Field label="E-mail (opcional)">
                  <input
                    type="email"
                    maxLength={160}
                    value={identity.email}
                    onChange={(event) => updateText("email", event.target.value)}
                    placeholder="contato@docesdaana.com.br"
                    className={inputClass}
                  />
                </Field>
                <Field label="Endereço (opcional)">
                  <input
                    type="text"
                    maxLength={240}
                    value={identity.address}
                    onChange={(event) => updateText("address", event.target.value)}
                    placeholder="Ex.: São Paulo — SP"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <Field label="Condições comerciais padrão (opcional)">
              <textarea
                maxLength={1_000}
                value={identity.defaultCommercialTerms}
                onChange={(event) => updateText("defaultCommercialTerms", event.target.value)}
                placeholder="Ex.: 50% de sinal para confirmar a encomenda."
                className={`${inputClass} min-h-24 resize-y`}
              />
              <span className="text-xs text-stone-500 dark:text-stone-400">
                Este texto aparece quando as condições do orçamento atual estiverem vazias.
              </span>
            </Field>
          </div>
        </div>

        <aside>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Prévia da identidade
          </p>
          <div
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
            style={{ borderColor: theme.secondary }}
          >
            <div
              className="flex min-h-24 items-center gap-3 border-b-4 p-4"
              style={{ borderColor: theme.primary }}
            >
              {identity.logoDataUrl ? (
                <Image
                  unoptimized
                  src={identity.logoDataUrl}
                  alt=""
                  width={160}
                  height={80}
                  className="h-14 w-24 object-contain object-left"
                />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                  style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
                  aria-hidden="true"
                >
                  {displayBrandName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold" style={{ color: theme.primaryText }}>
                  {displayBrandName}
                </p>
                <p className="text-xs text-stone-500">Orçamento comercial</p>
              </div>
            </div>
            <div
              className="m-4 rounded-lg border-l-4 p-3 text-sm"
              style={{
                backgroundColor: theme.secondaryTint,
                borderColor: theme.secondary,
                color: theme.onSecondaryTint,
              }}
            >
              Logo, contatos e paleta serão usados na visualização e também ao imprimir
              ou salvar em PDF.
            </div>
          </div>
        </aside>
      </div>

      {message && (
        <p
          className={`mt-5 rounded-lg px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
    </label>
  );
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onCommit: (value: string) => void;
}

function ColorField({ id, label, value, onCommit }: ColorFieldProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  function commitDraft(): void {
    const normalized = normalizeHexColor(draft);
    if (!normalized) {
      setError("Use o formato hexadecimal, como #be123c.");
      return;
    }
    setDraft(normalized);
    setError(null);
    onCommit(normalized);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    }
  }

  return (
    <div className="text-sm">
      <label htmlFor={id} className="font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          id={id}
          type="color"
          value={normalizeHexColor(draft) ?? value}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
            onCommit(event.target.value);
          }}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-white p-1 dark:border-stone-700 dark:bg-stone-950"
          aria-label={`${label}: seletor visual`}
        />
        <input
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          maxLength={7}
          aria-label={`${label}: código hexadecimal`}
          aria-invalid={Boolean(error)}
          className={inputClass}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
