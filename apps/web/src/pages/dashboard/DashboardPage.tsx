import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PenLine, Plus, BookOpen, Settings, LogOut,
  Sparkles, ChevronRight, Clock,
} from "lucide-react";
import { api } from "../../lib/api/client";
import { useAuthStore } from "../../lib/store/auth";
import type { Project } from "@vibewriting/shared";

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/project/${project.id}`}
      className="group relative flex flex-col p-5 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-purple-500/30 hover:bg-white/[0.05] transition-all duration-200 animate-fade-in"
    >
      {/* Genre badge */}
      {project.genre && (
        <span className="absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/8">
          {project.genre}
        </span>
      )}

      {/* Icon */}
      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mb-4 group-hover:bg-purple-500/15 transition-colors">
        <BookOpen className="w-4.5 h-4.5 text-purple-400" />
      </div>

      {/* Title */}
      <h3 className="font-medium text-white/80 group-hover:text-white transition-colors line-clamp-2 pr-12 leading-snug">
        {project.title}
      </h3>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-white/35 mt-1.5 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1 text-[11px] text-white/25">
          <Clock className="w-3 h-3" />
          {new Date(project.updatedAt).toLocaleDateString("zh-CN", {
            month: "short", day: "numeric",
          })}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
      <div className="skeleton w-9 h-9 rounded-xl" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get<Project[]>("/projects")
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function createProject() {
    setCreating(true);
    try {
      const project = await api.post<Project>("/projects", { title: "未命名作品" });
      navigate(`/project/${project.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-white/6 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <PenLine className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-semibold text-white/90 tracking-tight">vibewriting</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={() => signOut().then(() => navigate("/login"))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              title="退出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header row */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">我的作品</h1>
            <p className="text-sm text-white/30 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={createProject}
            disabled={creating}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            新建作品
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mb-5">
              <Sparkles className="w-8 h-8 text-purple-400/60" />
            </div>
            <p className="text-white/40 text-sm mb-1">还没有作品</p>
            <p className="text-white/25 text-xs mb-6">点击「新建作品」开始你的第一个故事</p>
            <button
              onClick={createProject}
              className="flex items-center gap-2 h-9 px-5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              新建作品
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
