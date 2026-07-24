// Catálogo estático de emojis do Composer (PRD Story §11), organizado nas
// categorias do PRD. "Recentes" é montada em runtime a partir do localStorage.

export const EMOJI_CATEGORIES = [
  {
    id: 'pessoas',
    label: 'Pessoas',
    emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😜', '🤔', '🤯', '😱', '😭', '🥺', '😴', '🤗', '🫶', '👍', '👎', '👏', '🙌', '🙏', '💪', '👀', '🗣️', '💁', '🤝', '✌️', '🤞', '👉', '👈', '☝️', '💃']
  },
  {
    id: 'animais',
    label: 'Animais',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮', '🐷', '🐸', '🐵', '🐔', '🦄', '🐝', '🦋', '🐢', '🐬', '🐳', '🦈', '🐙', '🦜', '🦩']
  },
  {
    id: 'comida',
    label: 'Comida',
    emojis: ['🍎', '🍉', '🍇', '🍓', '🍌', '🥑', '🌽', '🍕', '🍔', '🍟', '🌭', '🌮', '🍣', '🍜', '🍝', '🥗', '🍰', '🧁', '🍩', '🍪', '🍫', '🍿', '☕', '🧋', '🍹', '🥂']
  },
  {
    id: 'atividades',
    label: 'Atividades',
    emojis: ['⚽', '🏀', '🏈', '🎾', '🏐', '🎱', '🏋️', '🧘', '🏃', '🚴', '🏆', '🥇', '🎯', '🎮', '🎲', '🎸', '🎤', '🎧', '🎬', '🎨', '🎭', '🎪', '🎉', '🎊', '🎁', '🎈']
  },
  {
    id: 'viagens',
    label: 'Viagens',
    emojis: ['✈️', '🚗', '🚕', '🚌', '🚲', '🛵', '🚀', '🛳️', '🗺️', '🧳', '🏖️', '🏝️', '🏔️', '🗻', '🏕️', '🌅', '🌄', '🌇', '🗽', '🗼', '🏰', '⛩️', '🌍', '🌎', '🌏', '📍']
  },
  {
    id: 'objetos',
    label: 'Objetos',
    emojis: ['📱', '💻', '⌚', '📷', '🎥', '💡', '🔦', '🕯️', '📚', '✏️', '📌', '📎', '🔑', '🔒', '🛒', '💳', '💰', '💎', '🛍️', '📦', '📣', '🔔', '⏰', '🧲', '🪄', '🎀']
  },
  {
    id: 'simbolos',
    label: 'Símbolos',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💯', '✨', '⭐', '🌟', '💫', '🔥', '⚡', '💥', '💢', '❗', '❓', '✅', '❌', '⚠️', '♻️', '🔞', '🆕', '🆓', '🔝', '➡️', '⬅️', '⬆️', '⬇️', '🔴', '🟢', '🔵', '🟡']
  },
  {
    id: 'bandeiras',
    label: 'Bandeiras',
    emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🇧🇷', '🇺🇸', '🇵🇹', '🇪🇸', '🇫🇷', '🇮🇹', '🇩🇪', '🇬🇧', '🇯🇵', '🇰🇷', '🇨🇳', '🇦🇷', '🇲🇽', '🇨🇦']
  }
];

// Normalização usada por toda a busca do painel Elementos: minúsculas, sem
// acento e sem espaços nas pontas.
export function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Nomes de busca (§12) — pt-BR, minúsculos e sem acento.
export const EMOJI_NAMES = {
  '😀': 'rosto feliz sorriso', '😁': 'sorriso dentes', '😂': 'chorando de rir risada', '🤣': 'rolando de rir risada', '😊': 'sorriso timido feliz', '😍': 'apaixonado olhos de coracao',
  '🥰': 'apaixonado coracoes amor', '😘': 'beijo', '😎': 'oculos escuros estiloso', '🤩': 'olhos de estrela deslumbrado', '🥳': 'festa aniversario comemoracao', '😜': 'lingua piscando brincadeira',
  '🤔': 'pensando duvida', '🤯': 'cabeca explodindo chocado', '😱': 'gritando medo susto', '😭': 'chorando triste', '🥺': 'olhos pidoes carente', '😴': 'dormindo sono',
  '🤗': 'abraco carinho', '🫶': 'maos formando coracao amor', '👍': 'joinha positivo curtir', '👎': 'polegar para baixo negativo', '👏': 'palmas aplauso parabens', '🙌': 'maos para cima comemoracao',
  '🙏': 'gratidao por favor oracao', '💪': 'forca musculo academia', '👀': 'olhos olhando atencao', '🗣️': 'falando voz anuncio', '💁': 'atendimento informacao', '🤝': 'aperto de maos parceria acordo',
  '✌️': 'paz e amor vitoria', '🤞': 'dedos cruzados sorte', '👉': 'apontando para direita', '👈': 'apontando para esquerda', '☝️': 'dedo para cima atencao', '💃': 'dancando festa',
  '🐶': 'cachorro pet', '🐱': 'gato pet', '🐭': 'rato', '🐹': 'hamster', '🐰': 'coelho pascoa', '🦊': 'raposa',
  '🐻': 'urso', '🐼': 'panda', '🐨': 'coala', '🦁': 'leao', '🐯': 'tigre', '🐮': 'vaca',
  '🐷': 'porco', '🐸': 'sapo', '🐵': 'macaco', '🐔': 'galinha', '🦄': 'unicornio', '🐝': 'abelha',
  '🦋': 'borboleta', '🐢': 'tartaruga', '🐬': 'golfinho', '🐳': 'baleia', '🦈': 'tubarao', '🐙': 'polvo',
  '🦜': 'papagaio', '🦩': 'flamingo',
  '🍎': 'maca fruta', '🍉': 'melancia fruta', '🍇': 'uva fruta', '🍓': 'morango fruta', '🍌': 'banana fruta', '🥑': 'abacate',
  '🌽': 'milho', '🍕': 'pizza', '🍔': 'hamburguer lanche', '🍟': 'batata frita', '🌭': 'cachorro quente', '🌮': 'taco mexicano',
  '🍣': 'sushi japones', '🍜': 'lamen sopa', '🍝': 'macarrao massa', '🥗': 'salada saudavel', '🍰': 'bolo fatia doce', '🧁': 'cupcake doce',
  '🍩': 'rosquinha donut', '🍪': 'biscoito cookie', '🍫': 'chocolate', '🍿': 'pipoca cinema', '☕': 'cafe xicara', '🧋': 'cha de bolhas bubble tea',
  '🍹': 'drink coquetel', '🥂': 'brinde tacas champanhe',
  '⚽': 'futebol bola', '🏀': 'basquete bola', '🏈': 'futebol americano', '🎾': 'tenis bola', '🏐': 'volei bola', '🎱': 'sinuca bilhar',
  '🏋️': 'academia musculacao peso', '🧘': 'yoga meditacao', '🏃': 'corrida correr', '🚴': 'bicicleta ciclismo pedalar', '🏆': 'trofeu campeao vencedor', '🥇': 'medalha de ouro primeiro lugar',
  '🎯': 'alvo meta objetivo', '🎮': 'videogame jogo controle', '🎲': 'dado jogo sorte', '🎸': 'guitarra violao musica', '🎤': 'microfone cantar podcast', '🎧': 'fone de ouvido musica',
  '🎬': 'claquete cinema filme gravacao', '🎨': 'pintura arte paleta', '🎭': 'teatro mascaras', '🎪': 'circo tenda', '🎉': 'festa confete comemoracao', '🎊': 'confete festa',
  '🎁': 'presente surpresa brinde', '🎈': 'balao festa aniversario',
  '✈️': 'aviao viagem voo', '🚗': 'carro automovel', '🚕': 'taxi', '🚌': 'onibus', '🚲': 'bicicleta', '🛵': 'moto scooter entrega',
  '🚀': 'foguete lancamento crescimento', '🛳️': 'navio cruzeiro', '🗺️': 'mapa mundi', '🧳': 'mala bagagem viagem', '🏖️': 'praia guarda-sol ferias', '🏝️': 'ilha deserta paraiso',
  '🏔️': 'montanha com neve', '🗻': 'monte fuji', '🏕️': 'acampamento camping', '🌅': 'nascer do sol', '🌄': 'amanhecer na montanha', '🌇': 'por do sol cidade',
  '🗽': 'estatua da liberdade nova york', '🗼': 'torre de toquio', '🏰': 'castelo', '⛩️': 'templo japones', '🌍': 'globo mundo europa africa', '🌎': 'globo mundo americas',
  '🌏': 'globo mundo asia oceania', '📍': 'pin localizacao endereco',
  '📱': 'celular smartphone', '💻': 'notebook computador', '⌚': 'relogio de pulso smartwatch', '📷': 'camera fotografica foto', '🎥': 'filmadora video', '💡': 'lampada ideia dica',
  '🔦': 'lanterna', '🕯️': 'vela', '📚': 'livros estudo conteudo', '✏️': 'lapis escrever', '📌': 'alfinete fixar importante', '📎': 'clipe de papel anexo',
  '🔑': 'chave acesso segredo', '🔒': 'cadeado seguranca privado', '🛒': 'carrinho de compras loja', '💳': 'cartao de credito pagamento', '💰': 'saco de dinheiro lucro', '💎': 'diamante joia premium',
  '🛍️': 'sacolas de compras', '📦': 'caixa entrega encomenda', '📣': 'megafone anuncio divulgacao', '🔔': 'sino notificacao lembrete', '⏰': 'despertador alarme hora', '🧲': 'ima atrair',
  '🪄': 'varinha magica truque', '🎀': 'laco de presente',
  '❤️': 'coracao vermelho amor', '🧡': 'coracao laranja', '💛': 'coracao amarelo', '💚': 'coracao verde', '💙': 'coracao azul', '💜': 'coracao roxo',
  '🖤': 'coracao preto', '🤍': 'coracao branco', '💔': 'coracao partido', '💯': 'cem pontos nota maxima', '✨': 'brilhos novo especial', '⭐': 'estrela favorito',
  '🌟': 'estrela brilhante destaque', '💫': 'estrela cadente', '🔥': 'fogo em alta quente', '⚡': 'raio rapido energia', '💥': 'explosao impacto', '💢': 'simbolo de raiva',
  '❗': 'exclamacao atencao', '❓': 'interrogacao duvida pergunta', '✅': 'check confirmado certo', '❌': 'xis errado cancelado', '⚠️': 'atencao aviso alerta', '♻️': 'reciclagem sustentavel',
  '🔞': 'proibido para menores dezoito', '🆕': 'novo new', '🆓': 'gratis free', '🔝': 'topo top melhor', '➡️': 'seta para direita', '⬅️': 'seta para esquerda',
  '⬆️': 'seta para cima', '⬇️': 'seta para baixo', '🔴': 'circulo vermelho ao vivo', '🟢': 'circulo verde disponivel', '🔵': 'circulo azul', '🟡': 'circulo amarelo',
  '🏁': 'bandeira quadriculada chegada', '🚩': 'bandeira vermelha alerta', '🎌': 'bandeiras cruzadas', '🏴': 'bandeira preta', '🏳️': 'bandeira branca', '🏳️‍🌈': 'bandeira arco-iris orgulho lgbt',
  '🇧🇷': 'brasil bandeira', '🇺🇸': 'estados unidos eua bandeira', '🇵🇹': 'portugal bandeira', '🇪🇸': 'espanha bandeira', '🇫🇷': 'franca bandeira', '🇮🇹': 'italia bandeira',
  '🇩🇪': 'alemanha bandeira', '🇬🇧': 'reino unido inglaterra bandeira', '🇯🇵': 'japao bandeira', '🇰🇷': 'coreia do sul bandeira', '🇨🇳': 'china bandeira', '🇦🇷': 'argentina bandeira',
  '🇲🇽': 'mexico bandeira', '🇨🇦': 'canada bandeira'
};

// Busca de emojis (§12): por nome, categoria ou o próprio caractere.
export function searchEmojis(query) {
  const term = normalizeSearch(query);
  if (!term) return [];
  return EMOJI_CATEGORIES.flatMap((category) => category.emojis.filter((emoji) =>
    emoji === String(query || '').trim()
    || normalizeSearch(category.label).includes(term)
    || normalizeSearch(EMOJI_NAMES[emoji] || '').includes(term)
  ));
}

export const RECENT_EMOJIS_KEY = 'composer:recent-emojis';
export const RECENT_EMOJIS_LIMIT = 24;
