import ContentBriefForm from "@/components/ContentBriefForm";
import KanbanBoard from "@/components/KanbanBoard";
import { Sparkles, LayoutDashboard, Settings, User, Calendar, FileText, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-alabaster">
      {/* Navigation */}
      <nav className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate rounded-lg flex items-center justify-center text-white">
                <Sparkles size={18} />
              </div>
              <span className="font-heading font-bold text-slate text-xl tracking-tight">FOAI Pipeline</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-8 mx-8">
            <Link href="/" className="text-sm font-bold text-slate hover:text-sage transition-colors">Dashboard</Link>
            <Link href="/briefs" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Briefs</Link>
            <Link href="/drafts" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors flex items-center gap-1.5">
              <FileText size={13} /> Drafts
            </Link>
            <Link href="/library" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Library</Link>
            <Link href="/settings" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Brand Voice</Link>
            <Link href="/calendar" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors flex items-center gap-1.5">
              <Calendar size={13} /> Calendar
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-sage/10 text-sage hover:bg-sage/20 border-none px-3 py-1 font-bold">
              Production Mode
            </Badge>
            <div className="flex items-center gap-2 text-slate/40">
              <Link href="/settings" className="w-8 h-8 rounded-full bg-alabaster flex items-center justify-center hover:text-slate cursor-pointer transition-colors">
                <Settings size={18} />
              </Link>
              <div className="w-8 h-8 rounded-full bg-alabaster flex items-center justify-center hover:text-slate cursor-pointer transition-colors">
                <User size={18} />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Hero Section */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-terracotta/10 text-terracotta rounded-full font-bold text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-1000">
            <LayoutDashboard size={12} />
            <span>AI Content Studio v2.0</span>
          </div>
          <h1 className="text-6xl font-heading font-bold text-slate tracking-tight max-w-3xl mx-auto leading-[0.9]">
            Convert One Brief into <span className="text-sage">Omnichannel</span> Content.
          </h1>
          <p className="text-lg text-slate/40 max-w-xl mx-auto font-medium">
            Generate, draft, schedule, and publish — all from a single brief.
          </p>
          {/* Quick Actions */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link href="/drafts">
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs font-bold border-slate/10 hover:border-sage hover:text-sage cursor-pointer transition-all">
                <FileText size={12} className="mr-1.5" /> View Drafts
              </Badge>
            </Link>
            <Link href="/calendar">
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs font-bold border-slate/10 hover:border-terracotta hover:text-terracotta cursor-pointer transition-all">
                <Calendar size={12} className="mr-1.5" /> Content Calendar
              </Badge>
            </Link>
          </div>
        </header>

        <Separator className="bg-slate/5" />

        {/* Input Section */}
        <section className="relative">
          <div className="absolute inset-0 bg-sage/5 blur-[120px] rounded-full -z-10" />
          <ContentBriefForm />
        </section>

        {/* Workspace Section */}
        <section className="space-y-8 pb-20">
          <div className="flex items-end justify-between px-4">
            <div>
              <h2 className="text-3xl font-heading font-bold text-slate tracking-tight">Production Workspace</h2>
              <p className="text-slate/40 text-sm font-medium">Real-time workflow and approval engine</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="rounded-lg border-slate/10 text-slate/40 font-bold uppercase tracking-tighter text-[10px]">
                Realtime Sync Active
              </Badge>
            </div>
          </div>
          <KanbanBoard />
        </section>
      </main>
    </div>
  );
}
