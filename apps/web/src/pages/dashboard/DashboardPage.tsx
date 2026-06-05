import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PenLine, Plus, BookOpen, Settings, LogOut } from "lucide-react";
import { api } from "../../lib/api/client";
import { useAuthStore } from "../../lib/store/auth";
import { Button } from "../../components/ui/Button";
import type { Project } from "@vibewriting/shared";

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
      const project = await api.post<Project>("/projects", {
        title: "未命名作品",
      });
      navigate(`/project/${project.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[hsl(var(--border))] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="w-5 h-5 text-purple-400" />
          <span className="font-semibold">vibewriting</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut().then(() => navigate("/login"))}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">我的作品</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {user?.email}
            </p>
          </div>
          <Button onClick={createProject} disabled={creating}>
            <Plus className="w-4 h-4" />
            新建作品
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
            加载中...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto" />
            <p className="text-[hsl(var(--muted-foreground))]">
              还没有作品，点击「新建作品」开始创作
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="group rounded-lg border border-[hsl(var(--border))] p-5 hover:border-purple-500/50 hover:bg-[hsl(var(--muted))] transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <BookOpen className="w-5 h-5 text-purple-400 mt-0.5" />
                  {project.genre && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">
                      {project.genre}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-medium group-hover:text-purple-300 transition-colors line-clamp-2">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
