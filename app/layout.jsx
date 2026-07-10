import './globals.css';

export const metadata = {
  title: 'SocialHub PRO',
  description: 'Gerenciador de redes sociais multi-marca'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
