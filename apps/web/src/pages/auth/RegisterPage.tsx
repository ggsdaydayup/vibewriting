import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../lib/auth";
import { PenLine, ArrowRight, Loader2 } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-[360px] animate-fade-in-scale">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/20 mb-4">
            <PenLine className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">创建账号</h1>
          <p className="text-sm text-white/40 mt-1.5">开始你的 AI 写作之旅</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full h-11 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              密码 <span className="text-white/25 normal-case tracking-normal">（至少 8 位）</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              className="w-full h-11 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>创建账号 <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          已有账号？{" "}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
