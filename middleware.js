import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Rotas que o guard de página não redireciona.
// /api/* se autentica sozinha (sessão via cookies, CRON_SECRET, etc.) — nunca redirecionar.
const PUBLIC = ['/login', '/auth', '/approve', '/api'];

export async function middleware(request) {
  // O layout do grupo (app) precisa saber qual rota está sendo pedida para
  // decidir o gate da jornada guiada, e Server Components não têm acesso ao
  // pathname. O middleware é o único ponto que o conhece a tempo — mas não
  // decide nada aqui: resolver a jornada no edge custaria caro em toda request.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(list) {
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', appUrl));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2?)$).*)']
};
