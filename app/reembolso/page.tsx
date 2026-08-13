import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/legal/LegalPage";
import SupportLink from "@/components/support/SupportLink";

export const metadata: Metadata = {
  title: "Política de reembolso — Minha Fatia",
  description:
    "Como pedir reembolso do Minha Fatia Essencial, o que acontece com o acesso e o que fazer antes, se o problema for de acesso.",
};

/**
 * Política de reembolso — Fase P0-8A.
 *
 * ⚠️ Linguagem deliberadamente conservadora. O prazo e as condições de reembolso
 * são os apresentados no checkout da plataforma de pagamento; esta página **não
 * cria garantia própria**, porque prometer aqui algo diferente do checkout é
 * exatamente o tipo de divergência que vira reclamação.
 *
 * O que esta página afirma sobre acesso é comportamento verificado do produto:
 * reembolso e chargeback processados encerram o acesso na requisição seguinte
 * (Fase 4-7H, validada em produção).
 */
export default function ReembolsoPage() {
  return (
    <LegalPage
      title="Política de reembolso"
      intro="Como funciona o pedido de reembolso do Minha Fatia Essencial, o que acontece com o seu acesso e o que resolver antes, se o problema for só de entrar no app."
    >
      <LegalSection title="1. Antes de pedir reembolso, fale com a gente">
        <p>
          Boa parte dos pedidos de reembolso é, na verdade, um problema de acesso — e quase todos
          se resolvem em minutos:
        </p>
        <LegalList
          items={[
            "o convite ou o link de nova senha caiu na caixa de spam;",
            "a compra foi feita com um e-mail e o login tentado com outro;",
            "a senha foi esquecida — nesse caso, use a opção “Esqueci minha senha” na tela de entrar;",
            "o link do convite expirou e basta pedir um novo.",
          ]}
        />
        <p>
          Se qualquer um desses for o seu caso, chame o suporte antes. É mais rápido do que abrir
          um pedido de reembolso e você não perde o acesso.
        </p>
        <SupportLink
          variant="button"
          label="Preciso de ajuda com meu acesso"
          message="Olá! Comprei o Minha Fatia e estou com dificuldade para acessar. Pode me ajudar?"
        />
      </LegalSection>

      <LegalSection title="2. Como funciona o reembolso">
        <p>
          A compra do Minha Fatia Essencial é processada por uma plataforma de pagamento externa.
          O pedido de reembolso é feito por ela e{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            segue as condições e os prazos apresentados no checkout no momento da sua compra
          </strong>
          , além das regras da própria plataforma.
        </p>
        <p>
          Guarde o e-mail de confirmação do pedido: é nele que estão a identificação da compra e o
          caminho de atendimento da plataforma. O suporte do Minha Fatia também pode orientar você
          nesse processo.
        </p>
      </LegalSection>

      <LegalSection title="3. Direito de arrependimento">
        <p>
          Como a compra é feita pela internet, você tem o direito de arrependimento previsto no
          artigo 49 do Código de Defesa do Consumidor: pode desistir em até{" "}
          <strong>7 dias corridos</strong> contados da compra, sem precisar justificar.
        </p>
        <p>
          Condições adicionais, se existirem, são as informadas no checkout — esta página não cria
          nem amplia garantia diferente da apresentada lá.
        </p>
      </LegalSection>

      <LegalSection title="4. O que acontece com o seu acesso">
        <p>
          O acesso ao app está vinculado à situação da compra. Quando um reembolso ou um
          chargeback é processado,{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            o acesso ao Minha Fatia é encerrado automaticamente
          </strong>
          . Isso vale também para bloqueio por uso indevido.
        </p>
        <LegalList
          items={[
            "O encerramento é automático e acontece logo após a plataforma comunicar a devolução.",
            "Comprar novamente não remove um bloqueio aplicado por uso indevido.",
            "Se o reembolso foi pedido por engano, fale com o suporte antes de comprar de novo.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Seus dados depois do reembolso">
        <p>
          Os cadastros do Essencial ficam salvos no navegador do seu aparelho, e não no nosso
          servidor — então eles não são apagados por causa do reembolso. O que se perde é o acesso
          ao app.
        </p>
        <p>
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            Se você pretende pedir reembolso, exporte o backup antes
          </strong>
          , em Configurações, enquanto ainda tem acesso. Depois do encerramento, as telas do app
          deixam de abrir.
        </p>
      </LegalSection>

      <LegalSection title="6. Onde ver as demais condições">
        <p>
          O que a compra inclui está nos{" "}
          <Link href="/termos" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
            Termos de uso
          </Link>
          , e o tratamento dos seus dados está na{" "}
          <Link
            href="/privacidade"
            className="font-medium text-rose-600 hover:underline dark:text-rose-400"
          >
            Política de privacidade
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
