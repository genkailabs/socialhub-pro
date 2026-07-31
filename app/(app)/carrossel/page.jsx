import { redirect } from 'next/navigation';

export const metadata = { title: 'Carrossel' };

// O Studio vive dentro do Composer. Mantemos esta rota apenas para links antigos.
export default function CarrosselPage() {
  redirect('/composer?format=carrossel');
}
