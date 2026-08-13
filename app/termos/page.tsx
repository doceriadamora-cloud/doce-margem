import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalList, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Termos de uso — Minha Fatia",
  description:
    "Como funciona o acesso ao Minha Fatia Essencial, o que a compra única inclui e quais são os limites da ferramenta.",
};

/**
 * Termos de uso — Fase P0-8A.
 *
 * Pública e sem guarda: precisa ser lida **antes** da compra.
 *
 * A redação evita juridiquês de propósito. O público é confeiteira iniciante, e
 * um termo que ninguém entende não protege ninguém — só transfere o problema
 * para o suporte depois.
 */
export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de uso"
      intro="Estes termos explicam, em linguagem simples, o que é o Minha Fatia, o que você recebe ao comprar o Essencial e o que a ferramenta não faz."
    >
      <LegalSection title="1. O que é o Minha Fatia">
        <p>
          O Minha Fatia é uma ferramenta de apoio à gestão e à precificação de pequenos negócios
          de produção artesanal. Ele reúne ingredientes, receitas, embalagens, mão de obra e custos
          fixos, calcula custos e apresenta um preço sugerido, uma margem e um markup a partir dos
          dados que você informa.
        </p>
        <p>
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            O Minha Fatia não substitui um contador
          </strong>{" "}
          e não é um sistema contábil ou fiscal. Ele não emite nota fiscal, não apura imposto e não
          transmite obrigação nenhuma para órgão público. Impostos, regime tributário e obrigações
          fiscais variam conforme o negócio e devem ser avaliados com um profissional.
        </p>
      </LegalSection>

      <LegalSection title="2. Quem pode usar">
        <LegalList
          items={[
            "O acesso é pessoal e vinculado ao e-mail usado na compra.",
            "Você é responsável por manter sua senha em segurança e por tudo que for feito na sua conta.",
            "A conta não pode ser compartilhada, revendida, cedida ou transferida para outra pessoa.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. O que você compra">
        <p>
          A oferta disponível hoje é o <strong>Minha Fatia Essencial</strong>: pagamento único, sem
          mensalidade e sem renovação, com{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            acesso vitalício à versão Essencial atual
          </strong>
          .
        </p>
        <LegalList
          items={[
            "O acesso funciona por login e é controlado por licença: não há arquivo para baixar nem link público aberto.",
            "A compra inclui os recursos identificados na página de planos no momento da compra.",
            "Recursos novos e avançados que dependam de serviços contínuos — nuvem, automação, inteligência artificial e relatórios — poderão fazer parte de um Minha Fatia Pro Anual futuro, que seria um produto separado.",
            "O Pro Anual não está disponível hoje e não tem preço nem data anunciados.",
          ]}
        />
        <p>
          Veja a oferta atual em{" "}
          <Link href="/precos" className="font-medium text-rose-600 hover:underline dark:text-rose-400">
            Planos e preços
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Onde ficam os seus dados">
        <p>
          No Essencial, os cadastros que você faz — ingredientes, receitas, embalagens, custos
          fixos, canais, configurações, identidade do orçamento e rascunho de orçamento — ficam
          salvos <strong>no navegador do seu próprio aparelho</strong>, e não nos nossos
          servidores.
        </p>
        <p>
          Isso tem uma consequência prática importante:{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-200">
            limpar os dados do navegador, usar outro aparelho ou trocar de celular sem exportar o
            backup faz esses cadastros se perderem
          </strong>
          . O backup fica em Configurações e é responsabilidade sua fazê-lo de tempos em tempos.
        </p>
        <p>
          O que guardamos no servidor é apenas o necessário para o acesso funcionar — detalhado na{" "}
          <Link
            href="/privacidade"
            className="font-medium text-rose-600 hover:underline dark:text-rose-400"
          >
            Política de privacidade
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Sua responsabilidade sobre os números">
        <p>
          Todo cálculo do Minha Fatia parte exclusivamente dos dados que você preenche. Preço de
          ingrediente desatualizado, rendimento estimado errado ou custo esquecido produzem um
          resultado errado — a ferramenta não tem como saber disso.
        </p>
        <LegalList
          items={[
            "O preço sugerido é uma sugestão de apoio à decisão, não uma obrigação nem uma recomendação de mercado.",
            "O preço final que você cobra é sempre uma decisão do seu negócio.",
            "O Minha Fatia não garante lucro, venda, faturamento ou qualquer resultado financeiro.",
            "Conferir os dados informados e os valores obtidos antes de usá-los é responsabilidade de quem usa.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Limites de uso">
        <p>Ao usar o Minha Fatia, você concorda em não:</p>
        <LegalList
          items={[
            "compartilhar, revender ou distribuir seu acesso;",
            "tentar burlar o controle de licença ou acessar áreas para as quais não tem permissão;",
            "copiar, redistribuir ou revender o conteúdo e a estrutura do produto;",
            "usar o serviço para qualquer finalidade ilegal.",
          ]}
        />
        <p>
          O descumprimento pode levar à suspensão ou ao encerramento do acesso, sem prejuízo das
          medidas cabíveis.
        </p>
      </LegalSection>

      <LegalSection title="7. Suporte">
        <p>
          O suporte é feito pelo WhatsApp indicado nesta página, em dias úteis. Ele cobre acesso,
          compra, licença e dúvidas sobre o funcionamento do app.
        </p>
        <p>
          O suporte não faz consultoria de preço, não define a margem do seu negócio e não presta
          orientação contábil ou fiscal.
        </p>
      </LegalSection>

      <LegalSection title="8. Mudanças no produto e nestes termos">
        <p>
          O Minha Fatia continua sendo desenvolvido, e telas, textos e recursos podem mudar com o
          tempo. Ajustes de melhoria e correção fazem parte do produto e não alteram o que você
          comprou: o acesso vitalício à versão Essencial atual continua valendo.
        </p>
        <p>
          Se estes termos mudarem de forma relevante, a data de atualização no topo da página muda
          junto. Alterações não retroagem sobre compras já realizadas.
        </p>
      </LegalSection>

      <LegalSection title="9. Cancelamento e reembolso">
        <p>
          As condições de reembolso e o que acontece com o acesso quando um reembolso é aprovado
          estão na{" "}
          <Link
            href="/reembolso"
            className="font-medium text-rose-600 hover:underline dark:text-rose-400"
          >
            Política de reembolso
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
