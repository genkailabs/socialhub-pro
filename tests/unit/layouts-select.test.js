import { describe, expect, it } from 'vitest';
import { classifyContent, selectStructure, selectStyle, selectLayoutPlan } from '@/lib/layouts/select';

describe('classificação do conteúdo (§12)', () => {
  it('respeita o tipo declarado pelo planejamento', () => {
    expect(classifyContent({ contentType: 'promocao', title: 'Como fazer pao' })).toBe('promocao');
  });

  it('reconhece dado, pergunta, oferta, notícia e lista', () => {
    expect(classifyContent({ stat: '72%', title: 'Mercado em alta' })).toBe('dado');
    expect(classifyContent({ title: 'Quanto voce paga de imposto hoje?' })).toBe('engajamento');
    expect(classifyContent({ title: 'Oferta de inverno com desconto' })).toBe('promocao');
    expect(classifyContent({ title: 'Governo anunciou nova regra' })).toBe('noticia');
    expect(classifyContent({ title: 'Organize seu mes', bullets: ['a', 'b', 'c'] })).toBe('educativo');
  });

  it('cai em autoridade quando nada é específico', () => {
    expect(classifyContent({ title: 'Nosso trabalho' })).toBe('autoridade');
  });
});

describe('seleção de estrutura (§12/§13)', () => {
  const noticiaComImagem = {
    title: 'Nova regra muda o calculo do imposto',
    subtitle: 'A mudanca vale a partir do proximo mes.',
    hasImage: true,
    bullets: []
  };

  it('escolhe estrutura com imagem quando há imagem', () => {
    const { structure } = selectStructure({ content: noticiaComImagem, contentType: 'noticia', shape: 'square' });
    expect(['imagem-titulo', 'titulo-imagem-texto', 'editorial']).toContain(structure.id);
  });

  it('não repete a estrutura usada no post anterior', () => {
    const primeira = selectStructure({ content: noticiaComImagem, contentType: 'noticia', shape: 'square' }).structure.id;
    const segunda = selectStructure({
      content: noticiaComImagem, contentType: 'noticia', shape: 'square', recentStructures: [primeira]
    }).structure.id;
    expect(segunda).not.toBe(primeira);
  });

  it('avisa quando teve de repetir por falta de alternativa', () => {
    const conteudo = { title: 'Frase curta', quote: 'Frase curta', bullets: [] };
    const pick = selectStructure({
      content: conteudo, contentType: 'inspiracao', shape: 'square',
      recentStructures: ['citacao', 'manchete', 'conteudo-limpo', 'capa-carrossel']
    });
    expect(typeof pick.repeated).toBe('boolean');
    expect(pick.structure).toBeTruthy();
  });

  it('cai na manchete quando só existe um título', () => {
    const { structure } = selectStructure({ content: { title: 'Somente o titulo' }, shape: 'square' });
    expect(['manchete', 'conteudo-limpo', 'capa-carrossel']).toContain(structure.id);
  });

  // Empate entre estruturas fazia vencer a genérica, e o texto do aviso (ou da
  // citação, ou da estatística) era descartado sem a peça mostrar o assunto.
  it('prefere a estrutura que desenha o campo especial do conteúdo', () => {
    const aviso = selectStructure({
      content: { title: 'Atendimento em novo horario', subtitle: 'Agende pelo WhatsApp.', warning: 'A partir de segunda atendemos das 9h as 18h.', cta: 'Agendar', bullets: [] },
      contentType: 'servico', shape: 'square'
    });
    expect(aviso.structure.id).toBe('aviso');

    const estatistica = selectStructure({
      content: { title: '72% das empresas erram o calculo', subtitle: 'Levantamento com 400 empresas.', stat: '72%', bullets: [] },
      contentType: 'dado', shape: 'square'
    });
    expect(estatistica.structure.id).toBe('estatistica');
  });

  it('penaliza estrutura curta com texto demais (§13)', () => {
    const textao = {
      title: 'Um titulo longo o suficiente para pesar na conta de densidade da peca',
      subtitle: 'x'.repeat(200),
      bullets: []
    };
    const { structure } = selectStructure({ content: textao, contentType: 'autoridade', shape: 'square' });
    expect(structure.density).not.toBe('airy');
  });
});

describe('seleção de estilo (§6/§12)', () => {
  it('obedece o estilo fixado pela marca', () => {
    const { style, forced } = selectStyle({ brand: { styleId: 'premium' }, contentType: 'noticia' });
    expect(style.id).toBe('premium');
    expect(forced).toBe(true);
  });

  it('usa o nicho da marca antes do tipo de conteúdo', () => {
    const { style } = selectStyle({ brand: { niche: 'advocacia' }, contentType: 'noticia' });
    expect(style.id).toBe('premium');
  });

  it('varia quando ninguém pediu estilo e o anterior é o mesmo', () => {
    const anterior = selectStyle({ contentType: 'noticia' }).style.id;
    const proximo = selectStyle({ contentType: 'noticia', recentStyles: [anterior] }).style.id;
    expect(proximo).not.toBe(anterior);
  });

  it('mantém o estilo da marca mesmo repetido — identidade não é repetição', () => {
    const pick = selectStyle({ brand: { niche: 'advocacia' }, contentType: 'noticia', recentStyles: ['premium'] });
    expect(pick.style.id).toBe('premium');
    expect(pick.repeated).toBe(true);
  });
});

describe('plano completo', () => {
  it('devolve razões legíveis para o mascote (§15)', () => {
    const plan = selectLayoutPlan({
      content: { title: 'Governo anunciou nova regra', subtitle: 'Entenda o impacto.', hasImage: true },
      brand: { niche: 'contabilidade', name: 'Marca' }
    });
    expect(plan.contentType).toBe('noticia');
    expect(plan.structure).toBeTruthy();
    expect(plan.style).toBeTruthy();
    expect(plan.reasons.length).toBeGreaterThanOrEqual(3);
    expect(plan.reasons.join(' ')).toContain(plan.style.label);
  });

  it('usa a forma alta para Story', () => {
    const plan = selectLayoutPlan({
      content: { title: 'Titulo' }, size: { width: 1080, height: 1920 }
    });
    expect(plan.shape).toBe('story');
  });
});
