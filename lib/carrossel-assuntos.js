// De onde sai o ASSUNTO do carrossel — e como ele vira entrada do gerador.
// Puro, sem I/O.
//
// A etapa "Ideia" misturava duas coisas diferentes: estratégia de conteúdo
// ("conteúdo humanizado", "usar Reels") e assunto de carrossel. Estratégia não
// é tendência: ninguém para o dedo por causa de "educação e valor". Este módulo
// existe para separar as duas.
//
// Um assunto vem de três lugares, e só destes três:
//   buscar  — o Hub pesquisa acontecimentos recentes do nicho da marca
//   fonte   — a pessoa traz o material (link, notícia, transcrição, texto)
//   proprio — a pessoa escreve o assunto
//
// A busca muda com o nicho porque o que é "acontecimento" muda com o nicho: em
// entretenimento é a celebridade; em tecnologia é o lançamento. Pesquisar
// "tendências" no genérico devolve dica de marketing, que foi exatamente o
// defeito que este módulo corrige.

const MAX_SOURCE_MATERIAL = 6000;

function text(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function slug(value) {
  return text(value, 100)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'assunto';
}

// Cada vertical diz DUAS coisas ao pesquisador: o que conta como acontecimento
// ali (`foco`) e onde esse acontecimento costuma ser publicado (`fontes`). Sem
// a segunda, a busca cai sempre nos mesmos portais de negócios.
export const VERTICAIS = Object.freeze([
  {
    id: 'entretenimento',
    label: 'Entretenimento',
    pistas: ['entretenimento', 'musica', 'música', 'artista', 'cantor', 'banda', 'celebridade', 'famoso', 'tv', 'novela', 'cinema', 'filme', 'serie', 'série', 'streaming', 'podcast', 'humor', 'influencer', 'criador de conteudo', 'criador de conteúdo'],
    foco: 'celebridades, televisão, música, streaming e acontecimentos virais',
    fontes: 'portais de entretenimento, colunas de celebridades e veículos de cultura pop'
  },
  {
    id: 'esportes',
    label: 'Esportes',
    pistas: ['esporte', 'futebol', 'time', 'clube', 'jogador', 'atleta', 'academia', 'personal', 'crossfit', 'corrida', 'fitness', 'treino', 'campeonato', 'basquete', 'volei', 'vôlei', 'mma', 'luta'],
    foco: 'jogadores, clubes, campeonatos, transferências e bastidores do esporte',
    fontes: 'portais esportivos, sites de clubes e agências de notícia de esporte'
  },
  {
    id: 'tecnologia',
    label: 'Tecnologia',
    pistas: ['tecnologia', 'tech', 'software', 'saas', 'aplicativo', 'app', 'desenvolvedor', 'programacao', 'programação', 'startup', 'inteligencia artificial', 'inteligência artificial', ' ia ', 'dados', 'seguranca digital', 'segurança digital', 'ti'],
    foco: 'lançamentos, inteligência artificial, aplicativos, plataformas e mudanças de regra das big techs',
    fontes: 'veículos de tecnologia, blogs oficiais de produto e anúncios das próprias empresas'
  },
  {
    id: 'negocios',
    label: 'Negócios',
    pistas: ['negocio', 'negócio', 'empresa', 'empreend', 'consultoria', 'contabil', 'contábil', 'financ', 'vendas', 'marketing', 'imobili', 'juridic', 'jurídic', 'advocacia', 'varejo', 'comercio', 'comércio', 'franquia', 'rh', 'gestao', 'gestão'],
    foco: 'empresas, mercado, decisões de marca, regulação e comportamento do consumidor',
    fontes: 'veículos de economia e negócios, associações do setor e comunicados oficiais das empresas'
  },
  {
    id: 'moda-beleza',
    label: 'Moda e beleza',
    pistas: ['moda', 'beleza', 'estetica', 'estética', 'salao', 'salão', 'cabelo', 'cabeleire', 'maquiagem', 'make', 'unha', 'manicure', 'barbearia', 'barbeiro', 'skincare', 'roupa', 'boutique', 'perfum', 'sobrancelha'],
    foco: 'celebridades, tapetes vermelhos, tendências visuais, lançamentos de produto e virais de rotina',
    fontes: 'revistas de moda e beleza, colunas de estilo e lançamentos das marcas'
  },
  {
    id: 'saude',
    label: 'Saúde e bem-estar',
    pistas: ['saude', 'saúde', 'nutri', 'clinica', 'clínica', 'odonto', 'dentista', 'psico', 'terapia', 'medic', 'médic', 'fisioterapia', 'enfermagem', 'veterinar', 'veterinár'],
    foco: 'estudos publicados, decisões de órgãos de saúde, hábitos em mudança e produtos que viralizaram',
    fontes: 'órgãos oficiais de saúde, publicações científicas noticiadas e veículos de saúde'
  }
]);

export const VERTICAL_GERAL = Object.freeze({
  id: 'geral',
  label: 'Geral',
  pistas: [],
  foco: 'acontecimentos recentes, decisões de marcas conhecidas e comportamentos que ganharam atenção',
  fontes: 'veículos de notícia de alcance nacional e comunicados oficiais'
});

/**
 * Nicho escrito pela marca → vertical de pesquisa.
 *
 * Casa por pista, não por igualdade: ninguém escreve "esportes" no Brand Kit —
 * escreve "academia de bairro" ou "assessoria de corrida". Sem nicho, cai no
 * geral, que é honesto: pesquisa mais larga em vez de fingir um recorte.
 */
export function verticalDoNicho(niche) {
  const alvo = ` ${text(niche, 240).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')} `;
  if (alvo.trim().length === 0) return VERTICAL_GERAL;
  const achou = VERTICAIS.find((vertical) => vertical.pistas.some((pista) => {
    const limpa = pista.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return alvo.includes(limpa.trim().length <= 3 ? ` ${limpa.trim()} ` : limpa.trim());
  }));
  return achou || VERTICAL_GERAL;
}

/**
 * A pergunta que vai para o motor de pesquisa.
 *
 * Escrita para trazer FATO com data e fonte, não conselho de conteúdo: é a
 * diferença entre "o casamento do jogador dominou as redes" e "aposte em
 * conteúdo humanizado". Case de sucesso pede o outro recorte — a história de
 * quem fez, não o acontecimento da semana.
 */
export function consultaDeAssuntos({ tipo, niche, audience } = {}) {
  const vertical = verticalDoNicho(niche);
  const nichoTexto = text(niche, 120);
  const publico = text(audience, 160);

  const base = tipo === 'case-sucesso'
    ? [
      'cases reais e recentes de empresas, pessoas, campanhas ou produtos que mudaram de patamar',
      `no universo de ${vertical.foco}`,
      nichoTexto && `com leitura útil para quem atua em ${nichoTexto}`,
      'com o contexto, o que foi feito e por que funcionou descritos pela própria fonte'
    ]
    : [
      'acontecimentos, lançamentos e movimentos dos últimos 30 dias que ganharam atenção do público',
      `em ${vertical.foco}`,
      nichoTexto && `relevantes para quem atua em ${nichoTexto}`
    ];

  return [
    ...base.filter(Boolean),
    publico && `público: ${publico}`,
    `priorize ${vertical.fontes}`,
    'cada item precisa ter fonte original publicada e data; não estime números nem repita boato como fato'
  ].filter(Boolean).join(' — ');
}

// Data como a fonte publicou, no formato que se lê em português. String que não
// é data volta inteira: melhor mostrar "julho de 2026" do que apagar a única
// referência temporal que existe.
export function dataCurta(value) {
  const bruto = text(value, 40);
  if (!bruto) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  // `new Date` aceita quase qualquer coisa e chuta o resto: "julho de 2026"
  // virava 01/07/2026, uma precisão que a fonte nunca deu. Fora do ISO, o texto
  // volta como veio — mostrar "julho de 2026" é verdade; inventar o dia não é.
  return bruto;
}

/**
 * Saída crua da IA → assuntos exibíveis.
 *
 * A data e o veículo NÃO vêm do modelo: vêm da fonte pesquisada. Modelo escreve
 * o que entendeu; quem publicou e quando é registro, e registro não se pede a
 * quem pode alucinar. Assunto sem fonte citada some quando a fonte é exigida —
 * é o único jeito de a regra "toda notícia mostra fonte e data" ser verdade.
 */
export function normalizeAssuntos(brutos, sources, { exigeFonte = true } = {}) {
  const porId = new Map((Array.isArray(sources) ? sources : []).map((source) => [source.id, source]));
  const usados = new Set();

  return (Array.isArray(brutos) ? brutos : []).flatMap((bruto, index) => {
    const citadas = (Array.isArray(bruto?.sourceIds) ? bruto.sourceIds : [])
      .filter((id, posicao, todas) => porId.has(id) && todas.indexOf(id) === posicao)
      .slice(0, 3)
      .map((id) => porId.get(id));
    if (exigeFonte && !citadas.length) return [];

    const titulo = text(bruto?.titulo, 120);
    const resumo = text(bruto?.resumo, 320);
    const angulo = text(bruto?.angulo, 280);
    if (!titulo || !resumo || !angulo) return [];

    const base = slug(titulo);
    const id = usados.has(base) ? `${base}-${index + 1}` : base;
    usados.add(id);

    return [{
      id,
      titulo,
      resumo,
      angulo,
      relacaoComNicho: text(bruto?.relacaoComNicho, 240),
      confirmado: bruto?.confirmado !== false,
      fontes: citadas.map((source) => ({
        id: source.id,
        title: text(source.title, 200),
        url: source.url,
        publisher: text(source.publisher, 80),
        publishedAt: text(source.publishedAt, 40),
        data: dataCurta(source.publishedAt)
      }))
    }];
  });
}

// A linha que aparece embaixo do card: veículo e data, sem enfeite. Quando a
// fonte não publicou data, dizer isso é melhor que inventar uma.
export function rotuloDeFonte(assunto) {
  const fonte = assunto?.fontes?.[0];
  if (!fonte) return 'Sem fonte citada';
  const veiculo = fonte.publisher || fonte.title || 'Fonte';
  return fonte.data ? `${veiculo} · ${fonte.data}` : `${veiculo} · sem data publicada`;
}

/**
 * Assunto escolhido → assunto e material de origem do gerador.
 *
 * Mesmo contrato de `tendenciaParaEntrada`: a evidência viaja junto porque a
 * etapa seguinte exige fonte, e recusar depois da escolha pareceria defeito da
 * escolha. Boato entra marcado — o roteiro precisa saber que não pode afirmar.
 */
export function assuntoParaEntrada(assunto) {
  if (!assunto || typeof assunto !== 'object') return { topic: '', sourceMaterial: '', sources: [] };

  const fontes = Array.isArray(assunto.fontes) ? assunto.fontes : [];
  const partes = [
    assunto.resumo && `O que aconteceu: ${text(assunto.resumo, 600)}`,
    assunto.relacaoComNicho && `Por que interessa a esta marca: ${text(assunto.relacaoComNicho, 400)}`,
    assunto.angulo && `Ângulo sugerido: ${text(assunto.angulo, 400)}`,
    assunto.confirmado === false && 'Atenção: este assunto ainda não foi confirmado pelas fontes. Trate como rumor, sem afirmar que aconteceu.',
    fontes.length && ['Fontes:', ...fontes.map((fonte) => (
      `- ${fonte.title}${fonte.publisher ? ` (${fonte.publisher})` : ''}${fonte.data ? ` — ${fonte.data}` : ''}: ${fonte.url}`
    ))].join('\n')
  ].filter(Boolean);

  return {
    topic: text(assunto.titulo, 180),
    sourceMaterial: partes.join('\n\n').slice(0, MAX_SOURCE_MATERIAL),
    sources: fontes
  };
}

// Os três caminhos da etapa 2, com o texto que muda conforme o tipo: em case de
// sucesso o Hub não procura "tendência", procura história de quem fez.
export function modosDeAssunto(tipoId) {
  const busca = tipoId === 'case-sucesso'
    ? { label: 'Buscar cases reais', resumo: 'O Hub procura histórias recentes com fonte publicada.' }
    : { label: 'Buscar tendências atuais', resumo: 'O Hub procura acontecimentos recentes do seu nicho.' };
  return [
    { id: 'buscar', ...busca },
    { id: 'fonte', label: 'Usar uma fonte minha', resumo: 'Cole um link, uma notícia, uma transcrição ou um texto.' },
    { id: 'proprio', label: 'Escrever o assunto', resumo: 'Você já sabe sobre o que quer falar.' }
  ];
}
