import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, Lock, ArrowLeft, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { useLang } from "@/contexts/lang-context";
import { tr } from "@/i18n/translations";
import icon from "@/assets/icon.svg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in | Maya" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { loginWithGoogle, login } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { lang } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error(tr("login_err_fields", lang));
    try {
      await login(email, password, mode);
      if (mode === "signup") {
        toast.success(tr("signup_success", lang));
        setMode("signin");
        setEmail("");
        setPassword("");
      } else {
        toast.success(tr("login_toast_welcome_back", lang));
        navigate({ to: "/chat" });
      }
    } catch (err: any) {
      // show specific Firebase errors
      if (err.code === "auth/email-already-in-use") toast.error(tr("err_email_in_use", lang));
      else if (err.code === "auth/weak-password") toast.error(tr("err_weak_password", lang));
      else toast.error(tr("err_invalid_login", lang));
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      toast.success(tr("login_toast_welcome_back", lang));
      navigate({ to: "/chat" });
    } catch {
      toast.error(tr("err_invalid_login", lang));
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-[image:var(--gradient-hero)] items-center justify-center p-12">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-pink/50 blur-5xl" />
        <div className="relative max-w-md">
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <span className="w-18 h-18 rounded-xl flex items-center justify-center text-primary-foreground">
              <img src={icon} alt="Maya icon" className="w-18 h-18" />
            </span>
          </Link>
          <h2 className="mt-5 text-4xl font-semibold leading-tight">{tr("login_headline", lang)}</h2>
          <p className="mt-4 text-muted-foreground">{tr("login_sub", lang)}</p>
          <div className="mt-10 grid gap-3">
            {[tr("login_feat1", lang), tr("login_feat2", lang), tr("login_feat3", lang)].map(t => (
              <div key={t} className="flex items-center gap-3 p-3 rounded-xl bg-background/60 backdrop-blur border border-border/50 text-sm">
                <span className="w-2 h-2 rounded-full bg-primary" />{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex justify-between items-center p-4">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/"><ArrowLeft className="w-4 h-4" />{tr("login_back", lang)}</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <Card className="w-full max-w-md p-8 rounded-3xl border-border/60 shadow-[var(--shadow-card)]">
            <Link to="/" className="lg:hidden flex items-center gap-2 font-semibold mb-6">
              <span className="w-8 h-8 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground">
                <Heart className="w-4 h-4" fill="currentColor" />
              </span>Maya
            </Link>
            <h1 className="text-2xl font-semibold">
              {mode === "signin" ? tr("login_welcome_back", lang) : tr("login_create_acct", lang)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? tr("login_signin_sub", lang) : tr("login_signup_sub", lang)}
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{tr("login_email", lang)}</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={tr("login_email_ph", lang)} className="pl-9 h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{tr("login_password", lang)}</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={tr("login_pass_ph", lang)} className="pl-9 h-11 rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl mt-2">
                {mode === "signin" ? tr("login_btn_signin", lang) : tr("login_btn_create", lang)}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-background px-2">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              className="w-full h-11 rounded-xl flex items-center gap-2"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
              Continue with Google
            </Button>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              {mode === "signin" ? tr("login_new_here", lang) : tr("login_have_acct", lang)}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                {mode === "signin" ? tr("login_btn_create", lang) : tr("login_btn_signin", lang)}
              </button>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}