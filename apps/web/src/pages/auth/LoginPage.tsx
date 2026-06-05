import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PenLine } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <PenLine className="w-7 h-7 text-purple-400" />
            <span className="text-2xl font-semibold tracking-tight">vibewriting</span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            以人设为灵魂，写出属于你的故事
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">邮箱</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          没有账号？{" "}
          <Link to="/register" className="text-purple-400 hover:text-purple-300">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
