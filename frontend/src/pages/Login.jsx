import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  SearchCheck,
  Timer,
  Building2,
  Landmark,
  Users,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function Login() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get("portal");
  const [govMode, setGovMode] = useState(portalParam === "gov");

  const navigate = useNavigate();
  const { user, login, isCitizen, isGovernment } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (portalParam === "gov") setGovMode(true);
    else if (portalParam === "citizen") setGovMode(false);
  }, [portalParam]);

  useEffect(() => {
    if (user) {
      if (isGovernment) navigate("/government/dashboard", { replace: true });
      else if (isCitizen) navigate("/citizen/dashboard", { replace: true });
    }
  }, [user, isCitizen, isGovernment, navigate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in both email and password");
      return;
    }

    setBusy(true);
    try {
      const loggedUser = await login({
        email: email.trim(),
        password,
        role: govMode ? undefined : "client",
      });

      toast.success(`Welcome back, ${loggedUser.name}!`);

      if (loggedUser.role === "admin") {
        navigate("/admin/dashboard");
      } else if (loggedUser.role === "officer") {
        navigate("/government/dashboard");
      } else {
        navigate("/citizen/dashboard");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Invalid email or password";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (demoEmail, demoPass, isGov) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setGovMode(isGov);
    toast.info(`Filled credentials for ${demoEmail}`);
  };

  return (
    <AuthShell
      subtitle={govMode ? "Government Portal" : "Citizen Portal"}
      title="Welcome Back!"
      copy={
        govMode
          ? "Manage and resolve citizen complaints efficiently with AI review tools."
          : "Continue to report, track, and help build cleaner and safer communities."
      }
      features={[
        { icon: SearchCheck, t: "Report Civic Issues", d: "Upload photos and precise location" },
        { icon: Timer, t: "Track in Real Time", d: "Live status updates and milestones" },
        { icon: Building2, t: "Make a Better City", d: "Collaborate for transparent governance" },
      ]}
      quote="Together for Cleaner, Safer and Happier Communities"
    >
      {/* Portal Switcher Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => setGovMode(false)}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
            !govMode
              ? "bg-white text-primary shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Citizen Login</span>
        </button>
        <button
          type="button"
          onClick={() => setGovMode(true)}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
            govMode
              ? "bg-[#0B1736] text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>Government Login</span>
        </button>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-navy">
          {govMode ? t("portal_officer_title") : t("auth_login_title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth_login_subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="relative">
          <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            required
            placeholder={t("auth_email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11"
          />
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              required
              placeholder={t("auth_password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between px-0.5 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted-foreground hover:text-slate-800">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
              />
              <span>Remember me</span>
            </label>
            <Link
              to={`/forgot-password${govMode ? "?portal=gov" : ""}`}
              className="font-bold text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              {t("auth_forgot_password") || "Forgot password?"}
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant={govMode ? "navy" : "hero"}
          size="xl"
          className="w-full"
          disabled={busy}
        >
          {busy ? t("btn_submitting") : t("nav_login")} <ArrowRight />
        </Button>
      </form>

      {/* Quick Demo Credentials Autofill */}
      <div className="mt-6 border-t pt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick Demo Sign In:
        </p>

        {!govMode ? (
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo("citizen@example.com", "password123", false)}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 font-bold cursor-pointer transition-colors"
            >
              Citizen Demo (Ramesh)
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 font-medium">Select Department Officer or Administrator:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fillDemo("officer.water@example.com", "password123", true)}
                className="rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 p-2 font-bold cursor-pointer transition-colors border border-cyan-200/60 text-left"
              >
                <span className="block text-[10px] text-cyan-600 font-medium">💧 Water Supply</span>
                <span>Priya Verma</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("officer.roads@example.com", "password123", true)}
                className="rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 p-2 font-bold cursor-pointer transition-colors border border-amber-200/60 text-left"
              >
                <span className="block text-[10px] text-amber-600 font-medium">🛣️ Roads & Infra</span>
                <span>Rajesh Sharma</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("officer.sanitation@example.com", "password123", true)}
                className="rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-2 font-bold cursor-pointer transition-colors border border-emerald-200/60 text-left"
              >
                <span className="block text-[10px] text-emerald-600 font-medium">🗑️ Sanitation</span>
                <span>Amit Kumar</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("officer.electricity@example.com", "password123", true)}
                className="rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 p-2 font-bold cursor-pointer transition-colors border border-blue-200/60 text-left"
              >
                <span className="block text-[10px] text-blue-600 font-medium">⚡ Electricity</span>
                <span>Sunita Rao</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("officer.safety@example.com", "password123", true)}
                className="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 p-2 font-bold cursor-pointer transition-colors border border-rose-200/60 text-left"
              >
                <span className="block text-[10px] text-rose-600 font-medium">🛡️ Public Safety</span>
                <span>Meena Joshi</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin@example.com", "password123", true)}
                className="rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 p-2 font-bold cursor-pointer transition-colors border border-purple-200/60 text-left"
              >
                <span className="block text-[10px] text-purple-600 font-medium">👑 Administrator</span>
                <span>All Departments</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {!govMode ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Register now
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Authorized officers only. Department credentials are administrator-provisioned.
        </p>
      )}
    </AuthShell>
  );
}

export default Login;
