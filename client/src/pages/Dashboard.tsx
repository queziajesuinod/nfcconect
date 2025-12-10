import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Nfc, Users, Activity, Link2, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.stats.overview.useQuery();

  const statCards = [
    {
      title: "Tags NFC",
      value: stats?.totalTags ?? 0,
      icon: Nfc,
      href: "/dashboard/tags",
      description: "Tags cadastradas",
    },
    {
      title: "Usuários",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      href: "/dashboard/users",
      description: "Usuários registrados",
    },
    {
      title: "Conexões",
      value: stats?.totalConnections ?? 0,
      icon: Activity,
      href: "/dashboard/logs",
      description: "Total de interações",
    },
    {
      title: "Links",
      value: stats?.totalLinks ?? 0,
      icon: Link2,
      href: "/dashboard/links",
      description: "Links dinâmicos",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b-4 border-black pb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
              Dashboard
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl">
            Visão<br />Geral
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {statCards.map((stat, index) => (
            <Link key={stat.title} href={stat.href}>
              <div className={`border-4 border-black p-6 md:p-8 brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-white cursor-pointer group ${index % 2 === 0 ? 'md:-mr-1' : ''} ${index < 2 ? '-mb-1' : ''}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-black flex items-center justify-center">
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-gray-400 group-hover:text-black transition-colors" />
                </div>
                
                {isLoading ? (
                  <div className="h-16 bg-gray-100 animate-pulse mb-2" />
                ) : (
                  <div className="text-5xl md:text-6xl font-black tracking-tighter mb-2">
                    {stat.value.toLocaleString('pt-BR')}
                  </div>
                )}
                
                <h3 className="text-lg md:text-xl mb-1">{stat.title}</h3>
                <p className="text-sm text-gray-500 font-medium">{stat.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="border-4 border-black p-6 md:p-8 bg-black text-white">
          <h3 className="text-white mb-6">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/tags">
              <button className="w-full border-2 border-white px-6 py-4 font-bold uppercase tracking-tight hover:bg-white hover:text-black transition-all text-left flex items-center justify-between">
                <span>Nova Tag</span>
                <Nfc className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/dashboard/users">
              <button className="w-full border-2 border-white px-6 py-4 font-bold uppercase tracking-tight hover:bg-white hover:text-black transition-all text-left flex items-center justify-between">
                <span>Ver Usuários</span>
                <Users className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/dashboard/logs">
              <button className="w-full border-2 border-white px-6 py-4 font-bold uppercase tracking-tight hover:bg-white hover:text-black transition-all text-left flex items-center justify-between">
                <span>Ver Logs</span>
                <Activity className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
