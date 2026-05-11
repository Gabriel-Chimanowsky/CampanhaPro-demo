<?php

namespace Database\Seeders;

use App\Enums\AiTemplateType;
use App\Models\AiTemplate;
use Illuminate\Database\Seeder;

class AiTemplateSeeder extends Seeder
{
    public function run(): void
    {
        collect($this->templates())->each(function (array $template): void {
            AiTemplate::query()->updateOrCreate(
                ['slug' => $template['slug']],
                $template,
            );
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function templates(): array
    {
        return [
            [
                'name' => 'Post para Instagram',
                'slug' => 'post-para-instagram',
                'type' => AiTemplateType::Text,
                'description' => 'Transforme uma ideia ou oferta em uma copy curta, chamativa e pronta para publicar.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce e um estrategista de social media. Escreva em portugues do Brasil, com clareza, ritmo e foco em conversao.',
                'user_prompt_template' => 'Crie um post para Instagram sobre "{topic}" para o publico "{audience}" com tom "{tone}". Inclua uma abertura forte, desenvolvimento enxuto e CTA final.',
                'input_schema' => [
                    ['name' => 'topic', 'label' => 'Tema ou oferta', 'type' => 'textarea', 'required' => true, 'max' => 500],
                    ['name' => 'audience', 'label' => 'Publico', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'tone', 'label' => 'Tom', 'type' => 'select', 'required' => true, 'options' => ['profissional', 'amigavel', 'ousado']],
                ],
                'is_active' => true,
                'sort_order' => 10,
            ],
            [
                'name' => 'Legenda de Produto',
                'slug' => 'legenda-de-produto',
                'type' => AiTemplateType::Text,
                'description' => 'Gere legendas curtas para destacar atributos, desejo e urgencia de compra.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce escreve copies curtas para ecommerce com linguagem natural, clara e orientada a valor.',
                'user_prompt_template' => 'Crie uma legenda de produto para "{product_name}" destacando "{benefit}" com tom "{tone}".',
                'input_schema' => [
                    ['name' => 'product_name', 'label' => 'Nome do produto', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'benefit', 'label' => 'Beneficio principal', 'type' => 'textarea', 'required' => true, 'max' => 320],
                    ['name' => 'tone', 'label' => 'Tom', 'type' => 'select', 'required' => true, 'options' => ['premium', 'acessivel', 'direto']],
                ],
                'is_active' => true,
                'sort_order' => 20,
            ],
            [
                'name' => 'Descricao de Produto',
                'slug' => 'descricao-de-produto',
                'type' => AiTemplateType::Text,
                'description' => 'Monte descricoes mais completas para landing pages, catalogos ou ecommerce.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce escreve descricoes comerciais objetivas, com beneficios concretos e leitura escaneavel.',
                'user_prompt_template' => 'Escreva uma descricao de produto para "{product_name}" do segmento "{segment}" com foco em "{benefit}" e tom "{tone}".',
                'input_schema' => [
                    ['name' => 'product_name', 'label' => 'Produto', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'segment', 'label' => 'Segmento', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'benefit', 'label' => 'Beneficio central', 'type' => 'textarea', 'required' => true, 'max' => 320],
                    ['name' => 'tone', 'label' => 'Tom', 'type' => 'select', 'required' => true, 'options' => ['consultivo', 'vendas', 'elegante']],
                ],
                'is_active' => true,
                'sort_order' => 30,
            ],
            [
                'name' => 'Email de Vendas Curto',
                'slug' => 'email-de-vendas-curto',
                'type' => AiTemplateType::Text,
                'description' => 'Crie um email curto de outreach com promessa clara e CTA objetivo.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce escreve emails de vendas curtos, claros e com foco em resposta.',
                'user_prompt_template' => 'Crie um email de vendas curto para oferecer "{offer}" a "{audience}" com tom "{tone}". Inclua assunto e CTA.',
                'input_schema' => [
                    ['name' => 'offer', 'label' => 'Oferta', 'type' => 'textarea', 'required' => true, 'max' => 320],
                    ['name' => 'audience', 'label' => 'Publico', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'tone', 'label' => 'Tom', 'type' => 'select', 'required' => true, 'options' => ['direto', 'consultivo', 'amigavel']],
                ],
                'is_active' => true,
                'sort_order' => 40,
            ],
            [
                'name' => 'Resumo de Artigo',
                'slug' => 'resumo-de-artigo',
                'type' => AiTemplateType::Text,
                'description' => 'Condense um artigo ou texto longo em uma versao curta e facil de reutilizar.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce resume textos mantendo o contexto essencial, a clareza e a estrutura logica.',
                'user_prompt_template' => 'Resuma o artigo abaixo para o publico "{audience}" em ate "{max_words}" palavras:\n\n{article_text}',
                'input_schema' => [
                    ['name' => 'article_text', 'label' => 'Texto do artigo', 'type' => 'textarea', 'required' => true, 'max' => 5000],
                    ['name' => 'audience', 'label' => 'Publico final', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'max_words', 'label' => 'Numero maximo de palavras', 'type' => 'number', 'required' => true, 'min' => 50, 'max' => 500],
                ],
                'is_active' => true,
                'sort_order' => 50,
            ],
            [
                'name' => 'Imagem Promocional',
                'slug' => 'imagem-promocional',
                'type' => AiTemplateType::Image,
                'description' => 'Gere um visual promocional com foco em produto, campanha e atmosfera de marca.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce cria prompts visuais publicitarios sofisticados, limpos e com forte hierarquia composicional.',
                'user_prompt_template' => 'Crie uma imagem promocional para a campanha "{campaign_name}". Produto ou servico: "{subject}". Estilo visual: "{visual_direction}". Paleta ou mood: "{mood}".',
                'input_schema' => [
                    ['name' => 'campaign_name', 'label' => 'Campanha', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'subject', 'label' => 'Produto ou servico', 'type' => 'text', 'required' => true, 'max' => 160],
                    ['name' => 'visual_direction', 'label' => 'Direcao visual', 'type' => 'textarea', 'required' => true, 'max' => 500],
                    ['name' => 'mood', 'label' => 'Paleta ou mood', 'type' => 'text', 'required' => true, 'max' => 120],
                ],
                'is_active' => true,
                'sort_order' => 60,
            ],
            [
                'name' => 'Thumbnail de Campanha',
                'slug' => 'thumbnail-de-campanha',
                'type' => AiTemplateType::Image,
                'description' => 'Crie thumbnails para lancamentos, videos ou campanhas com leitura instantanea.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce pensa como diretor de arte para thumbnails com contraste, foco e apelo imediato.',
                'user_prompt_template' => 'Crie uma thumbnail de campanha para "{campaign_name}" com destaque visual em "{headline_focus}" e estilo "{visual_direction}".',
                'input_schema' => [
                    ['name' => 'campaign_name', 'label' => 'Campanha', 'type' => 'text', 'required' => true, 'max' => 120],
                    ['name' => 'headline_focus', 'label' => 'Elemento principal', 'type' => 'text', 'required' => true, 'max' => 160],
                    ['name' => 'visual_direction', 'label' => 'Direcao visual', 'type' => 'textarea', 'required' => true, 'max' => 500],
                ],
                'is_active' => true,
                'sort_order' => 70,
            ],
            [
                'name' => 'Capa Ilustrada Simples',
                'slug' => 'capa-ilustrada-simples',
                'type' => AiTemplateType::Image,
                'description' => 'Produza capas editoriais simples para guias, ebooks e materiais internos.',
                'provider' => null,
                'model' => null,
                'system_prompt' => 'Voce cria capas editoriais ilustradas com composicao limpa, legibilidade e atmosfera contemporanea.',
                'user_prompt_template' => 'Crie uma capa ilustrada simples para "{title}" com o tema "{theme}" e estilo "{visual_direction}".',
                'input_schema' => [
                    ['name' => 'title', 'label' => 'Titulo', 'type' => 'text', 'required' => true, 'max' => 160],
                    ['name' => 'theme', 'label' => 'Tema', 'type' => 'text', 'required' => true, 'max' => 160],
                    ['name' => 'visual_direction', 'label' => 'Direcao visual', 'type' => 'textarea', 'required' => true, 'max' => 500],
                ],
                'is_active' => true,
                'sort_order' => 80,
            ],
        ];
    }
}
