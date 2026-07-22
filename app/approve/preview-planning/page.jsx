// TEMPORARIO — pagina de inspecao visual do quadro de planejamento.
// Apagar depois da verificacao.
import { PlanningPanel } from '@/components/planning/PlanningPanel';

const items = [
  { id: '1', status: 'idea', format: 'image', date: '2026-07-22', title: 'Código Limpo em Python: 3 Dicas', pillar: 'Desenvolvimento de Software', suggested_time: '18:00', objective: 'Demonstrar aplicação prática', summary: 'Resumo curto da ideia.', hook: 'Gancho.', cta: 'Comente.', target_audience: 'Devs', estimated_duration: '45s' },
  { id: '2', status: 'idea', format: 'carousel', date: '2026-07-23', title: 'Arquitetura de Agentes de IA na Prática', pillar: 'Inteligência Artificial', suggested_time: '12:00' },
  { id: '3', status: 'approved', format: 'carousel', date: '2026-07-24', title: 'IA Generativa: Crie Conteúdo Autêntico', pillar: 'Inteligência Artificial', suggested_time: '12:00' },
  { id: '4', status: 'in_production', format: 'story', date: '2026-07-25', title: 'Bastidores de um Deploy Real', pillar: 'Engenharia', suggested_time: '09:00' },
  { id: '5', status: 'ready', post_id: 'p5', format: 'image', date: '2026-07-26', title: 'Ética em IA: O Que Ninguém Fala', pillar: 'Inteligência Artificial', suggested_time: '19:30' },
  { id: '6', status: 'ready', post_id: 'p6', post_status: 'published', format: 'carousel', date: '2026-07-20', title: 'Como Escolher Seu Primeiro Framework', pillar: 'Carreira', suggested_time: '11:00' }
];

export default function PreviewPlanningPage() {
  return (
    <main className="min-h-screen bg-app p-6">
      <PlanningPanel
        brandId="preview"
        weekStart="2026-07-21"
        plan={{ id: 'plan-preview', items, weekly_summary: 'Fortalecer a marca como referência em tecnologia e inovação.' }}
        hasStrategy
        postsPerWeek={7}
        planningUsage={{ used: 3, max: null, period: 'month' }}
      />
    </main>
  );
}
