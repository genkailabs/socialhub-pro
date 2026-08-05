import localFont from 'next/font/local';
import './globals.css';

export const metadata = {
  title: 'SocialHub PRO',
  description: 'Gerenciador de redes sociais multi-marca'
};

// Manrope variável (400–800), servida do próprio domínio. O arquivo é o subset
// latino do Google Fonts (24 KB) e cobre o português inteiro — não há chamada de
// rede para terceiro em runtime nem no build, então build offline continua
// funcionando. A stack do sistema fica como fallback do `font-display: swap`.
const manrope = localFont({
  src: '../public/fonts/manrope-latin.woff2',
  weight: '400 800',
  display: 'swap',
  variable: '--font-ui',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif']
});

// O Aurora Grid nasceu escuro: sem preferência salva, o app abre no escuro.
// Quem já escolheu "Claro" no ThemeToggle continua no claro.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-theme">{children}</body>
    </html>
  );
}
