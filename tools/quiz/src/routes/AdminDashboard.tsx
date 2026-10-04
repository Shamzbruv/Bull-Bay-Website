import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Library, PlusCircle, Settings } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { RequireHostAuth } from '../components/admin/RequireHostAuth';

export function AdminDashboard() {
  return (
    <RequireHostAuth>
      <AppShell theme="light">
        <div className="game-safe-area tv-safe-area max-w-3xl mx-auto text-bb-navy">
          <h1 className="font-display text-4xl font-black">Admin</h1>
          <p className="text-bb-navy/60 mt-1">Manage quizzes and tonight's setup.</p>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <AdminLink to="/admin/quizzes" icon={<Library size={22} />} title="Manage Quizzes" description="Edit, duplicate, publish or archive quizzes." />
            <AdminLink to="/admin/quizzes/new" icon={<PlusCircle size={22} />} title="Create Quiz" description="Build a new quiz from scratch or import JSON." />
            <AdminLink to="/settings" icon={<Settings size={22} />} title="Settings" description="Sound and buzzer keys." />
          </div>
        </div>
      </AppShell>
    </RequireHostAuth>
  );
}

function AdminLink({ to, icon, title, description }: { to: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-bb-navy/10 bg-white/80 p-5 hover:border-bb-blue/40 hover:shadow-lg transition">
      <div className="text-bb-blue mb-2">{icon}</div>
      <div className="font-display font-bold text-lg">{title}</div>
      <p className="text-sm text-bb-navy/60 mt-1">{description}</p>
    </Link>
  );
}
