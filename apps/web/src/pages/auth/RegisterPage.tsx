import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PenLine } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <PenLine className="w-8 h-8 text-purple-400 mx-auto" />
          <h2 className="text-lg font-medium">请查收确认邮件</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs">
            我们已向 {email} 发送了确认邮件，点击邮件中的链接完成注册。
          </p>
          <Link to="/login" className="text-sm text-purple-400 hover:text-purple-300">
            返回登录
          </Link>
        </div>
      </div>
    );
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
            创建账号，开始你的写作之旅
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
            <label className="text-sm text-[hsl(var(--muted-foreground))]">
              密码
              <span className="ml-1 text-[hsl(var(--muted-foreground))] text-xs">（至少 8 位）</span>
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "注册中..." : "创建账号"}
          </Button>
        </form>

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          已有账号？{" "}
          <Link to="/login" className="text-purple-400 hover:text-purple-300">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
