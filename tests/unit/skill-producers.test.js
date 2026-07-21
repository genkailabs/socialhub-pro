import { describe, expect, it } from 'vitest';
import { postProducerSkill, inputSchema as postIn, outputSchema as postOut } from '@/lib/ai/skills/post-producer';
import { storyPlannerSkill, inputSchema as storyIn, outputSchema as storyOut, STORY_CARDS, STORY_CARD_TYPES, STORY_CARD_LIMITS } from '@/lib/ai/skills/story-planner';
import { reelProducerSkill, inputSchema as reelIn, outputSchema as reelOut } from '@/lib/ai/skills/reel-producer';
import { producerOf } from '@/lib/formats';

const dna = {
  tone: 'acolhedor', audience: 'Adultos com ansiedade', personality: ['proxima'],
  emojiUsage: 'poucos', captionLength: 'media', ctaPolicy: 'convite gentil',
  donts: ['promessa de cura'], professionalRules: ['Citar CRP']
};
const base = { brandName: 'Clinica Ana', topic: 'Sinais de ansiedade', dna };

// O registro de formatos aponta para estas skills: se alguem renomear uma, o
// tema aprovado ficaria sem produtor e so quebraria na hora de gerar.
describe('registro aponta para os produtores certos', () => {
  it('cada formato tem uma skill que existe', () => {
    expect(producerOf('image')).toBe(postProducerSkill.id);
    expect(producerOf('carousel')).toBe(postProducerSkill.id);
    expect(producerOf('reel')).toBe(reelProducerSkill.id);
    expect(producerOf('stories')).toBe(storyPlannerSkill.id);
  });
});

describe('skill post-producer', () => {
  const prompt = (over = {}) => postProducerSkill.buildPrompt(postIn.parse({ ...base, format: 'image', ...over }));

  it('nao amarra provedor', () => {
    expect(postProducerSkill.provider).toBeUndefined();
  });

  it('so aceita imagem e carrossel', () => {
    expect(postIn.safeParse({ ...base, format: 'reel' }).success).toBe(false);
    expect(postIn.safeParse({ ...base, format: 'carousel' }).success).toBe(true);
  });

  it('leva o DNA e as proibicoes para o prompt', () => {
    const { user } = prompt();

    expect(user).toContain('acolhedor');
    expect(user).toContain('NAO mencionar: promessa de cura');
    expect(user).toContain('Citar CRP');
  });

  it('pede slides no carrossel e lista vazia na imagem', () => {
    expect(prompt({ format: 'carousel' }).user).toContain('carrossel');
    expect(prompt({ format: 'image' }).user).toContain('slides como lista vazia');
  });

  it('traduz o estagio em linguagem de gente', () => {
    expect(prompt({ stage: 'decisao' }).user).toContain('perto de contratar');
  });

  // O ajuste e a instrucao mais recente do usuario: tem que vencer o resto.
  it('coloca o ajuste do usuario por ultimo, com prioridade', () => {
    const { user } = prompt({ adjustment: 'deixe mais curto' });

    expect(user).toContain('prioridade');
    expect(user.trim().endsWith('deixe mais curto')).toBe(true);
  });

  it('proibe clickbait e promessa', () => {
    const { system } = prompt();

    expect(system).toContain('nao use clickbait');
    expect(system).toContain('nada de promessa de resultado');
  });

  // A arte nao pode vir com texto: o texto e queimado depois.
  it('proibe texto na imagem gerada', () => {
    expect(prompt().system).toContain('sem pedir texto na imagem');
  });

  it('exige alt text descritivo (acessibilidade)', () => {
    expect(prompt().system).toContain('para quem nao enxerga');
  });

  const postOk = {
    hook: 'Voce sabe quando e ansiedade?', caption: 'Texto da legenda.', cta: 'Salve este post',
    hashtags: ['#ansiedade'], slides: [], imagePrompt: 'calm room, soft light',
    altText: 'Sala clara com poltrona', needsProfessionalReview: true, reviewReason: 'tema de saude'
  };

  it('aceita a saida esperada', () => {
    expect(postOut.safeParse(postOk).success).toBe(true);
  });

  it('respeita o limite de legenda do Instagram', () => {
    expect(postOut.safeParse({ ...postOk, caption: 'x'.repeat(2300) }).success).toBe(false);
  });

  it('limita o carrossel a 8 slides', () => {
    const s = { title: 't', body: 'b', visualHint: 'v' };

    expect(postOut.safeParse({ ...postOk, slides: Array(8).fill(s) }).success).toBe(true);
    expect(postOut.safeParse({ ...postOk, slides: Array(9).fill(s) }).success).toBe(false);
  });

  it('exige a marcacao de revisao profissional', () => {
    const { needsProfessionalReview, ...semFlag } = postOk;

    expect(postOut.safeParse(semFlag).success).toBe(false);
  });
});

describe('skill story-planner', () => {
  const prompt = (over = {}) => storyPlannerSkill.buildPrompt(storyIn.parse({ ...base, ...over }));

  it('exige sequencia com arco, nao telas soltas', () => {
    const { system } = prompt();

    expect(system).toContain('arco');
    expect(system).toContain('fecha com uma acao clara');
  });

  it('oferece os cinco tipos de card', () => {
    const { system } = prompt();

    for (const t of STORY_CARD_TYPES) expect(system).toContain(t);
    expect(STORY_CARD_TYPES).toEqual(['abertura', 'educativo', 'bastidores', 'prova_social', 'cta_final']);
  });

  // MVP V2: Story virou arte estatica. Pedir enquadramento seria pedir algo que
  // ninguem vai executar.
  it('nao pede gravacao, camera nem cena', () => {
    const { system, user } = prompt();
    const texto = `${system} ${user}`.toLowerCase();

    for (const proibido of ['captureh', 'mediatype', 'enquadr', 'como filmar', 'video_curto']) {
      expect(texto).not.toContain(proibido);
    }
    // A palavra "gravar" so pode aparecer proibindo a gravacao.
    expect(system).toContain('Nunca escreva instrucao de como gravar');
  });

  // Sticker interativo nao passa pela Graph API: prometer seria mentir.
  it('nao oferece enquete nem caixa de perguntas', () => {
    const { system } = prompt();

    expect(system).not.toContain('caixa_de_perguntas');
    expect(system).toContain('Nao existe video, gravacao, camera, cena, fala, enquete nem caixa de perguntas.');
  });

  it('avisa que o proprio sistema gera a arte e publica', () => {
    expect(prompt().user).toContain('o sistema gera a arte de cada card e publica sozinho');
  });

  // Quem entra no meio da sequencia nao viu o card anterior.
  it('exige card que se entende sozinho', () => {
    expect(prompt().system).toContain('cada arte precisa fazer sentido sozinha');
  });

  const cardOk = { order: 1, type: 'abertura', title: 'Voce dorme mal?', support: '', cta: null };
  const seqOk = { objective: 'Educar sobre sono', cards: Array(3).fill(cardOk), rationale: 'Abre e educa.' };

  it('aceita a sequencia esperada', () => {
    expect(storyOut.safeParse(seqOk).success).toBe(true);
  });

  // Curta demais nao tem arco; longa demais e abandonada no meio.
  it('recusa sequencia curta ou longa demais', () => {
    expect(storyOut.safeParse({ ...seqOk, cards: Array(STORY_CARDS.min - 1).fill(cardOk) }).success).toBe(false);
    expect(storyOut.safeParse({ ...seqOk, cards: Array(STORY_CARDS.max + 1).fill(cardOk) }).success).toBe(false);
  });

  // O limite do texto e o da arte (§19), nao um numero inventado na skill.
  it('recusa titulo maior do que a arte aguenta', () => {
    const longo = { ...cardOk, title: 'x'.repeat(STORY_CARD_LIMITS.title + 1) };

    expect(storyOut.safeParse({ ...seqOk, cards: [longo, cardOk, cardOk] }).success).toBe(false);
  });

  it('aceita card sem apoio: titulo que se basta e melhor que apoio enfeite', () => {
    const { data } = storyOut.safeParse({ ...seqOk, cards: [{ order: 1, type: 'abertura', title: 'Oi', cta: null }, cardOk, cardOk] });

    expect(data.cards[0].support).toBe('');
  });

  it('recusa tipo de card inventado', () => {
    expect(storyOut.safeParse({ ...seqOk, cards: [{ ...cardOk, type: 'enquete' }, cardOk, cardOk] }).success).toBe(false);
  });

  it('sobe a versao: a saida mudou de formato', () => {
    expect(storyPlannerSkill.version).toBe(2);
  });
});

describe('skill reel-producer', () => {
  const prompt = (over = {}) => reelProducerSkill.buildPrompt(reelIn.parse({ ...base, ...over }));

  it('escreve do jeito que se fala', () => {
    expect(prompt().system).toContain('do jeito que a pessoa fala');
  });

  it('proibe termo de cinema e equipamento', () => {
    const { system } = prompt();

    expect(system).toContain('Nada de termo de cinema');
    expect(system).toContain('nada de equipamento');
  });

  it('lembra que a pessoa grava sozinha', () => {
    expect(prompt().user).toContain('sozinha, com um celular');
  });

  const cena = { order: 1, speech: 'Oi', screenText: 'Oi', action: 'De frente', seconds: 10 };
  const reelOk = {
    spokenHook: 'Voce sabe quando e ansiedade?', scenes: [cena, { ...cena, order: 2 }],
    totalSeconds: 30, caption: 'Legenda.', hashtags: ['#ansiedade'], cta: 'Me chame',
    recordingTips: ['Grave perto da janela'], needsProfessionalReview: true, reviewReason: 'saude'
  };

  it('aceita o roteiro esperado', () => {
    expect(reelOut.safeParse(reelOk).success).toBe(true);
  });

  // Reel de 3 minutos nao e Reel.
  it('recusa duracao fora do formato', () => {
    expect(reelOut.safeParse({ ...reelOk, totalSeconds: 180 }).success).toBe(false);
    expect(reelOut.safeParse({ ...reelOk, totalSeconds: 5 }).success).toBe(false);
  });

  it('exige pelo menos duas cenas', () => {
    expect(reelOut.safeParse({ ...reelOk, scenes: [cena] }).success).toBe(false);
  });
});
