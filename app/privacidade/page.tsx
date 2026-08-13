import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidade — Minha Fatia",
  description:
    "Quais dados o Minha Fatia usa, o que fica salvo apenas no seu navegador e como pedir correção ou exclusão.",
};

/**
 * Política de privacidade — Fase P0-8A.
 *
 * Descreve o funcionamento **real** do app hoje: conta e licença no servidor,
 * cadastros no navegador. Nada aqui promete tratamento que o código não faça —
 * uma política que descreve outro produto é pior do que nenhuma.
 */
export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de privacidade"
      intro="Esta página explica quais dados o Minha Fatia usa, quais ficam apenas no seu aparelho e como pedir acesso, correção ou exclusão."
    >
      <LegalSection title="1. O resumo em uma frase">
        <p>
          Guardamos no servidor apenas o necessário para você entrar e para o seu acesso ficar
          liberado.{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            Suas receitas, custos e preços não são enviados para a internet
          </strong>{" "}
          — eles ficam no navegador do seu aparelho.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que ficam no servidor">
        <LegalList
          items={[
            "E-mail da conta — é por ele que o acesso é liberado e que você entra.",
            "Nome, quando você informa no cadastro.",
            "Situação da sua licença: qual produto foi comprado, se está ativa, reembolsada ou bloqueada.",
            "Dados mínimos da compra recebidos da plataforma de pagamento: identificador do pedido, e-mail da compra e identificação do produto.",
            "Registros técnicos do processamento da compra, mantidos como auditoria de quando o acesso foi concedido ou encerrado.",
          ]}
        />
        <p>
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            Não recebemos e não armazenamos dados de cartão de crédito.
          </strong>{" "}
          O pagamento acontece inteiramente na plataforma de pagamento, que tem política própria.
        </p>
      </LegalSection>

      <LegalSection title="3. Dados que ficam só no seu navegador">
        <p>
          No Minha Fatia Essencial, tudo o que você cadastra fica no armazenamento local do
          navegador do seu aparelho:
        </p>
        <LegalList
          items={[
            "ingredientes, receitas, embalagens e mão de obra;",
            "custos fixos, faturamento estimado e canais de venda;",
            "identidade do orçamento, incluindo a logo que você enviar;",
            "rascunho do orçamento em andamento.",
          ]}
        />
        <p>
          Esses dados não são enviados aos nossos servidores e não são acessados por nós. A logo
          que você envia é redimensionada dentro do próprio navegador e salva apenas ali. Quando
          você exporta um backup, o arquivo é gerado no seu aparelho e fica sob sua guarda.
        </p>
      </LegalSection>

      <LegalSection title="4. Para que usamos esses dados">
        <LegalList
          items={[
            "criar e manter sua conta;",
            "liberar, manter e encerrar o acesso conforme a situação da compra;",
            "enviar mensagens necessárias ao acesso, como o convite inicial e o link de nova senha;",
            "prestar suporte quando você procura a gente;",
            "cumprir obrigações legais e manter registro do que foi concedido e revogado.",
          ]}
        />
        <p>Não vendemos seus dados e não os usamos para publicidade.</p>
      </LegalSection>

      <LegalSection title="5. Com quem os dados são compartilhados">
        <p>
          Apenas com prestadores de serviço necessários para o app funcionar, e apenas no
          necessário:
        </p>
        <LegalList
          items={[
            "plataforma de autenticação e banco de dados, onde ficam conta e licença;",
            "plataforma de pagamento, responsável pela compra e pelo reembolso;",
            "serviço de envio de e-mail, usado para o convite e para o link de nova senha;",
            "serviço de hospedagem do site.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Cookies">
        <p>
          Usamos apenas os cookies necessários para manter sua sessão aberta enquanto você navega
          pelas áreas protegidas. Não usamos cookies de publicidade nem rastreamento de terceiros.
        </p>
      </LegalSection>

      <LegalSection title="7. Por quanto tempo guardamos">
        <p>
          Conta e licença são mantidas enquanto sua conta existir. Os registros de concessão e
          encerramento de acesso são mantidos como auditoria da compra, inclusive depois de um
          reembolso, porque são a prova do que aconteceu.
        </p>
        <p>
          Os dados guardados no seu navegador ficam lá até você apagá-los, limpar o navegador ou
          importar outro backup por cima.
        </p>
      </LegalSection>

      <LegalSection title="8. Seus direitos">
        <p>
          Você pode pedir acesso, correção, portabilidade ou exclusão dos dados que estão com a
          gente. É só falar com o suporte pelo WhatsApp desta página, usando o e-mail da compra.
        </p>
        <LegalList
          items={[
            "Os dados salvos no seu navegador você mesma apaga, a qualquer momento, pelo próprio navegador — e pode levá-los com você exportando o backup em Configurações.",
            "Excluir a conta encerra o acesso ao app; os registros de auditoria da compra podem ser mantidos quando houver obrigação legal.",
          ]}
        />
      </LegalSection>

      <LegalSection title="9. Alterações nesta política">
        <p>
          Se o funcionamento mudar — por exemplo, quando existir sincronização em nuvem —, esta
          página é atualizada junto, e a data no topo muda. Vale a pena reler de vez em quando.
        </p>
        <p>
          As condições de compra e de acesso estão nos{" "}
          <Link href="/termos" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
            Termos de uso
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
