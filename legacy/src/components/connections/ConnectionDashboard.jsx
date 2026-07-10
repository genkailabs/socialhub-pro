import React from 'react';
import { CheckCircle2, Users, Clock, Globe, AlertCircle, Activity, Unplug } from 'lucide-react';

function formatNumber(num) {
  if (!num) return '--';
  const n = parseInt(num, 10);
  if (isNaN(n)) return '--';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function getRelativeTime(dateStr) {
  if (!dateStr || dateStr === '--') return '--';
  try {
    const parts = dateStr.split(' ');
    const datePart = parts[0].split('/');
    const timePart = parts[1] || '00:00:00';
    const date = new Date(`${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}`);
    if (isNaN(date.getTime())) return '--';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  } catch {
    return '--';
  }
}

export default function ConnectionDashboard({ networks }) {
  const connected = networks.filter(n => n.status === 'connected');
  const connectedCount = connected.length;
  const totalNetworks = networks.length;
  const hasConnections = connectedCount > 0;

  const totalFollowers = connected.reduce((sum, n) => {
    const raw = String(n.followers || '0').replace(/[^0-9]/g, '');
    const val = parseInt(raw, 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const lastSyncRaw = connected.reduce((latest, n) => {
    if (!n.lastSynced) return latest;
    return !latest || n.lastSynced > latest ? n.lastSynced : latest;
  }, null);

  const syncErrors = connected.filter(n =>
    n.expiresIn && (
      n.expiresIn.toLowerCase().includes('erro') ||
      n.expiresIn.toLowerCase().includes('expirado')
    )
  ).length;

  const items = [
    {
      label: 'Redes Conectadas',
      value: `${connectedCount}/${totalNetworks}`,
      icon: hasConnections ? CheckCircle2 : Unplug,
      color: hasConnections ? 'text-emerald-600 bg-emerald-100' : 'text-gray-400 bg-gray-100'
    },
    {
      label: 'Total Seguidores',
      value: formatNumber(totalFollowers),
      icon: Users,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      label: 'Última Sincronização',
      value: getRelativeTime(lastSyncRaw),
      icon: Clock,
      color: 'text-gray-600 bg-gray-100'
    },
    {
      label: 'Contas Disponíveis',
      value: totalNetworks,
      icon: Globe,
      color: 'text-indigo-600 bg-indigo-100'
    },
    {
      label: 'Alertas',
      value: syncErrors > 0 ? `${syncErrors} erro(s)` : '0 erros',
      icon: AlertCircle,
      color: syncErrors > 0 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
    },
    {
      label: 'Status Geral',
      value: hasConnections ? 'Online' : 'Offline',
      icon: Activity,
      color: hasConnections ? 'text-emerald-600 bg-emerald-100' : 'text-gray-400 bg-gray-100'
    }
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex flex-col gap-1.5 hover:shadow-md transition-shadow"
        >
          <div className={`p-1.5 rounded-lg w-fit ${item.color}`}>
            <item.icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-gray-900 leading-none">{item.value}</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
