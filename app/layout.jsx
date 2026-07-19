import './globals.css';

export const metadata = {
  title: 'SocialHub PRO',
  description: 'Gerenciador de redes sociais multi-marca'
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-theme">{children}</body>
    </html>
  );
}
