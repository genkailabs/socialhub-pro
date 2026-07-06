# 🚀 SocialHub MCP Server — Gerenciador e Automação de Redes Sociais

Bem-vindo ao **SocialHub MCP Server**, um servidor construído sob o padrão arquitetural **Model Context Protocol (MCP)** em Node.js. Este servidor confere a assistentes e agentes de Inteligência Artificial (como Claude Desktop, Antigravity, Cline, entre outros) a capacidade de publicar conteúdos, consultar estatísticas e interagir diretamente com **Meta (Instagram & Facebook)**, **YouTube Shorts**, **TikTok**, **Spotify Podcasters** e **WhatsApp Cloud API**.

---

## 💡 O que é o Model Context Protocol (MCP)?

O **Model Context Protocol (MCP)** é um padrão aberto que permite que Modelos de Linguagem Grande (LLMs) se conectem de forma segura e padronizada a fontes de dados externas, ferramentas e APIs. 

Em vez de você programar scripts manuais para cada postagem ou consulta de métricas, o servidor MCP expõe **ferramentas (tools)** estruturadas com esquemas claros. O agente de IA lê esses esquemas, entende quais parâmetros são necessários e executa automações nas suas redes sociais em seu nome, seja respondendo a comandos via chat ou executando fluxos de trabalho programados!

---

## 🌟 Principais Funcionalidades e Resiliência (Modo Sandbox)

O servidor **SocialHub MCP** foi planejado com arquitetura resiliente e **Simulação Inteligente (Sandbox)**:
- **Testes Sem Risco:** Se você não informar chaves reais de API ou utilizar valores como `"demo_token"`, o servidor não retornará erros fatais. Ele processará a requisição em **modo Sandbox** e retornará respostas simuladas de altíssima fidelidade!
- **Fallback Automático:** Caso uma API real falhe (ex: token expirado, cota da API atingida ou falta de permissão), o servidor captura o erro de forma elegante e realiza um fallback para a simulação, mantendo seu agente rodando perfeitamente.

### 🛠️ 10 Ferramentas de Automação Disponíveis:
1. `meta_post_instagram` — Publicação de fotos e vídeos no feed do Instagram.
2. `meta_get_analytics` — Consulta de alcance, impressões e top posts no Instagram ou Facebook.
3. `youtube_upload_short` — Registro e envio de vídeos curtos no YouTube Shorts.
4. `youtube_get_channel_stats` — Estatísticas de inscritos, visualizações totais e vídeos do canal.
5. `tiktok_post_video` — Publicação de vídeos virais no TikTok via URL.
6. `tiktok_get_analytics` — Consulta de engajamento, curtidas e seguidores no TikTok.
7. `spotify_get_episodes` — Listagem de episódios de podcasts/shows no Spotify.
8. `spotify_create_show_note_link` — Inserção de links de apoio e patrocínio nas Show Notes.
9. `whatsapp_send_message` — Envio imediato de mensagens de texto via WhatsApp Cloud API.
10. `whatsapp_send_media` — Envio de fotos, vídeos e documentos em conversas do WhatsApp.

---

## 📦 Instalação e Configuração

### 1. Instalar Dependências
No seu terminal, acesse o diretório do servidor MCP e instale as dependências via NPM:

```bash
cd "h:/GERENCIADOR REDES SOCIAIS/mcp-servers/social-hub-mcp"
npm install
```

### 2. Configurar Variáveis de Ambiente (Opcional para Modo de Produção)
Para realizar postagens reais e enviar mensagens verdadeiras no WhatsApp, copie o arquivo de exemplo e edite com suas chaves de API:

```bash
cp .env.example .env
```
> **Nota:** Se você não criar o arquivo `.env` ou deixar os valores padrão, o servidor funcionará perfeitamente no **Modo Sandbox / Simulação**!

---

## ⚙️ Como Configurar em Agentes de IA

Para que seu assistente ou IDE inteligente se conecte a este servidor, você deve registrar o transporte Stdio no arquivo de configuração do seu cliente MCP.

### 🖥️ Exemplo 1: Claude Desktop (`claude_desktop_config.json`)
No Windows, abra ou crie o arquivo em `%APPDATA%\Claude\claude_desktop_config.json` e adicione o bloco abaixo:

```json
{
  "mcpServers": {
    "social-hub-mcp": {
      "command": "node",
      "args": [
        "h:/GERENCIADOR REDES SOCIAIS/mcp-servers/social-hub-mcp/src/index.js"
      ],
      "env": {
        "META_ACCESS_TOKEN": "seu_token_real_ou_demo_token",
        "WHATSAPP_API_TOKEN": "seu_token_whatsapp_ou_demo_token",
        "WHATSAPP_PHONE_ID": "id_do_seu_numero_whatsapp"
      }
    }
  }
}
```

### ⚡ Exemplo 2: Antigravity IDE / Cline / Outros Agentes
No arquivo de configuração de servidores MCP da ferramenta, adicione o servidor apontando para o script principal:

```json
{
  "mcpServers": {
    "social-hub": {
      "command": "node",
      "args": ["h:/GERENCIADOR REDES SOCIAIS/mcp-servers/social-hub-mcp/src/index.js"]
    }
  }
}
```

---

## 🧪 Como Testar no Chat com o Agente

Após reiniciar seu cliente MCP, você poderá testar envios enviando comandos naturais para a IA no chat. Exemplos:

- **Teste no Instagram:**  
  *"Por favor, use o SocialHub para publicar uma foto no meu Instagram com a legenda 'Testando automação com agentes IA #MCP' e a imagem 'https://exemplo.com/foto.jpg'."*

- **Teste no WhatsApp:**  
  *"Envie uma mensagem de WhatsApp para o número '5511999999999' dizendo 'Olá! Esta mensagem foi enviada pelo meu agente de IA via SocialHub MCP!'."*

- **Consulta de Métricas no TikTok:**  
  *"Consulte as estatísticas de engajamento da minha conta no TikTok e me faça um resumo dos vídeos virais."*

---

## 👨‍💻 Estrutura do Projeto

```text
social-hub-mcp/
├── package.json              # Módulo ES6, scripts e dependências do SDK MCP
├── .env.example              # Exemplo didático de chaves de API das redes sociais
├── README.md                 # Documentação oficial do projeto
└── src/
    ├── index.js              # Inicialização do StdioTransport e registro das 10 Tools
    └── platforms/
        ├── meta.js           # Graph API (Instagram & Facebook)
        ├── youtube.js        # YouTube Data API v3 (Shorts & Analytics)
        ├── tiktok.js         # TikTok Open API v2 (Publish & Insights)
        ├── spotify.js        # Spotify Web API (Episódios & Show Notes)
        └── whatsapp.js       # WhatsApp Cloud API (Mensagens & Mídia)
```

---
*Desenvolvido pela Arquitetura de Servidores MCP Sênior do SocialHub.*
