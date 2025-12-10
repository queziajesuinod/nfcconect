import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Nfc, Users, Activity, Link2, ArrowRight, LogIn } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-4 border-black">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black flex items-center justify-center">
              <Nfc className="w-8 h-8 text-white" />
            </div>
            <span className="text-xl font-black uppercase tracking-tight">NFC//SYS</span>
          </div>
          
          {loading ? (
            <div className="w-32 h-10 bg-gray-100 animate-pulse" />
          ) : isAuthenticated ? (
            <Link href="/dashboard">
              <Button className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase">
                Dashboard <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button className="brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-bold uppercase">
                <LogIn className="mr-2 w-4 h-4" /> Entrar
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b-4 border-black">
        <div className="container py-20 md:py-32">
          <div className="max-w-5xl">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-sm font-bold uppercase tracking-widest bg-black text-white px-4 py-2">
                Sistema de Gerenciamento
              </span>
            </div>
            
            <h1 className="mb-8">
              <span className="block">Gravações</span>
              <span className="block text-gray-400">[NFC]</span>
            </h1>
            
            <p className="text-xl md:text-2xl font-medium max-w-2xl mb-12 leading-relaxed">
              Plataforma completa para gerenciar tags NFC, registrar conexões 
              de usuários e criar links dinâmicos personalizados.
            </p>
            
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="brutal-shadow text-lg px-8 py-6 h-auto hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all font-bold uppercase">
                  Acessar Dashboard <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="brutal-shadow text-lg px-8 py-6 h-auto hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all font-bold uppercase">
                  Começar Agora <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-b-4 border-black">
        <div className="container py-20">
          <h2 className="mb-16">
            <span className="brutal-underline">Funcionalidades</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-0">
            {/* Feature 1 */}
            <div className="border-4 border-black p-8 md:p-12 brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-white -mb-1 md:-mb-0 md:-mr-1">
              <div className="w-16 h-16 bg-black flex items-center justify-center mb-6">
                <Nfc className="w-10 h-10 text-white" />
              </div>
              <h3 className="mb-4">Tags NFC</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Gerencie todas as suas tags NFC em um só lugar. 
                Cadastre, edite e monitore o status de cada tag.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="border-4 border-black p-8 md:p-12 brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-white -mb-1 md:-mb-0">
              <div className="w-16 h-16 bg-black flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="mb-4">Usuários</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Registro automático na primeira leitura. 
                Valide e gerencie usuários conectados às tags.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="border-4 border-black p-8 md:p-12 brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-white md:-mr-1">
              <div className="w-16 h-16 bg-black flex items-center justify-center mb-6">
                <Activity className="w-10 h-10 text-white" />
              </div>
              <h3 className="mb-4">Logs</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Rastreie todas as interações com suas tags. 
                Histórico completo de conexões e atividades.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="border-4 border-black p-8 md:p-12 brutal-shadow-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-white">
              <div className="w-16 h-16 bg-black flex items-center justify-center mb-6">
                <Link2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="mb-4">Links</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                Crie links dinâmicos personalizados para cada usuário. 
                Redirecione para ações específicas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black text-white">
        <div className="container py-20 md:py-32">
          <div className="max-w-3xl">
            <h2 className="text-white mb-8">
              Pronto para<br />começar?
            </h2>
            <p className="text-xl text-gray-400 mb-12 leading-relaxed">
              Acesse o dashboard administrativo para gerenciar suas tags NFC, 
              visualizar usuários registrados e acompanhar todas as atividades.
            </p>
            
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="border-4 border-white text-white bg-transparent hover:bg-white hover:text-black text-lg px-8 py-6 h-auto font-bold uppercase transition-all">
                  Ir para Dashboard <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" variant="outline" className="border-4 border-white text-white bg-transparent hover:bg-white hover:text-black text-lg px-8 py-6 h-auto font-bold uppercase transition-all">
                  Fazer Login <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-black">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black flex items-center justify-center">
                <Nfc className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold uppercase tracking-tight">NFC//SYS</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              Sistema de Gerenciamento de Gravações NFC
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
