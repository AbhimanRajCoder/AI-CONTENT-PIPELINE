import ContentBriefForm from "@/components/ContentBriefForm";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function BriefsPage() {
  return (
    <div className="min-h-screen bg-alabaster">
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
            <Link href="/" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Dashboard</Link>
            <Link href="/briefs" className="text-sm font-bold text-slate hover:text-sage transition-colors">Briefs</Link>
            <Link href="/drafts" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Drafts</Link>
            <Link href="/library" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Library</Link>
            <Link href="/settings" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Brand Voice</Link>
            <Link href="/calendar" className="text-sm font-bold text-slate/40 hover:text-slate transition-colors">Calendar</Link>
          </div>
          <Badge variant="secondary" className="bg-sage/10 text-sage hover:bg-sage/20 border-none px-3 py-1 font-bold">
            Production Mode
          </Badge>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-heading font-bold text-slate tracking-tight">Content Briefs</h1>
          <p className="text-slate/40 text-lg font-medium max-w-2xl mx-auto">
            Define your strategy and initiate the AI generation pipeline.
          </p>
        </div>

        <section className="relative">
          <div className="absolute inset-0 bg-sage/5 blur-[120px] rounded-full -z-10" />
          <ContentBriefForm />
        </section>
      </main>
    </div>
  );
}
