import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  SearchCheck,
  Timer,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../context/LanguageContext";
import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import authService from "../services/authService";

const STEP_NAMES = ["Verify Email", "Reset Password"];

const calculatePasswordStrength = (pwd = "") => {
  if (!pwd) return { score: 0, label: "", color: "", percent: "0%" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

  if (score <= 1) return { score, label: "Weak", color: "text-red-500 bg-red-500", percent: "25%" };
  if (score <= 3) return { score, label: "Moderate", color: "text-amber-500 bg-amber-500", percent: "60%" };
  return { score, label: "Strong", color: "text-emerald-600 bg-emerald-500", percent: "100%" };
};

export function ForgotPassword() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get("portal");
  const isGov = portalParam === "gov";
  const navigate = useNavigate();

  // Step 1: Request OTP | Step 2: Enter OTP & New Password | Step 3: Success Confirmation
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const pwStrength = calculatePasswordStrength(newPassword);

  // Timer countdown for resending OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const data = await authService.forgotPassword({ email: cleanEmail });
      toast.success(data.message || "Verification code sent to your email!");
      if (data.otp) {
        setDevOtp(data.otp);
      }
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to process request. Please try again.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      toast.error("Verification code must be exactly 6 digits.");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const data = await authService.resetPassword({
        email: email.trim(),
        otp: cleanOtp,
        newPassword,
      });

      toast.success(data.message || "Password reset successfully!");
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to reset password. Please check code.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || busy) return;
    setBusy(true);
    try {
      const data = await authService.forgotPassword({ email: email.trim() });
      toast.success("A fresh verification code has been generated!");
      if (data.otp) {
        setDevOtp(data.otp);
      }
      setResendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Could not resend verification code.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    toast.info(`Selected demo email: ${demoEmail}`);
  };

  return (
    <AuthShell
      subtitle={isGov ? "Government Portal Security" : "Citizen Security"}
      title="Reset Password"
      copy="Safely recover access to your Smart Grievance Redressal account in two simple steps."
      features={[
        { icon: SearchCheck, t: "Secure Verification", d: "Time-limited 6-digit OTP sent to your registered email" },
        { icon: Timer, t: "Encrypted Credentials", d: "End-to-end bcrypt salted password hashing" },
        { icon: Building2, t: "Instant Restoration", d: "Immediate access to track or manage civic complaints" },
      ]}
      quote="Restoring civic connectivity with speed, reliability, and security"
    >
      {/* Step Progress Tracker */}
      {step < 3 && (
        <div className="mb-6 rounded-2xl bg-slate-50/80 p-3 border border-slate-100">
          <div className="flex items-center justify-between">
            {STEP_NAMES.map((name, i) => {
              const stepIndex = i + 1;
              const isPassed = step > stepIndex;
              const isCurrent = step === stepIndex;
              return (
                <div key={name} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all ${
                      isPassed
                        ? "bg-emerald-600 text-white shadow-xs"
                        : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-xs"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isPassed ? <Check className="h-4 w-4" /> : stepIndex}
                  </span>
                  <span
                    className={`text-[11px] tracking-tight ${
                      isCurrent
                        ? "font-extrabold text-primary"
                        : isPassed
                        ? "font-semibold text-emerald-700"
                        : "font-medium text-slate-400"
                    }`}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= STEP 1: REQUEST OTP ================= */}
      {step === 1 && (
        <div>
          <div className="border-b border-slate-100 pb-2.5 mb-5">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md mb-1.5">
              Step 1 of 2
            </span>
            <h2 className="text-xl font-extrabold text-navy">
              {t("auth_forgot_password") || "Forgot Password?"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("auth_forgot_subtitle") ||
                "Enter your registered email address and we'll send you a 6-digit verification code."}
            </p>
          </div>

          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Registered Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  required
                  placeholder={t("auth_email") || "name@example.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              variant={isGov ? "navy" : "hero"}
              size="xl"
              className="w-full"
              disabled={busy}
            >
              {busy ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>{t("auth_send_otp") || "Send Verification Code"}</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Test with Demo Account:
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo("citizen@example.com")}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 font-bold cursor-pointer transition-colors"
              >
                Citizen (Ramesh)
              </button>
              <button
                type="button"
                onClick={() => fillDemo("officer.water@example.com")}
                className="rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 px-3 py-1.5 font-bold cursor-pointer transition-colors border border-cyan-200/60"
              >
                Officer (Priya Verma)
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              to={`/login${isGov ? "?portal=gov" : ""}`}
              className="font-bold text-primary hover:underline"
            >
              Back to Login
            </Link>
          </p>
        </div>
      )}

      {/* ================= STEP 2: VERIFY OTP & SET PASSWORD ================= */}
      {step === 2 && (
        <div>
          <div className="border-b border-slate-100 pb-2.5 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Step 2 of 2
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setDevOtp("");
                }}
                className="text-xs text-primary hover:underline font-bold cursor-pointer"
              >
                Change Email
              </button>
            </div>
            <h2 className="text-xl font-extrabold text-navy">
              {t("auth_reset_password") || "Set New Password"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Verification code sent to: <strong className="text-slate-800">{email}</strong>
            </p>
          </div>

          {/* Dev/Demo Helper Chip */}
          {devOtp && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Demo Code: <strong className="font-mono text-sm tracking-widest text-amber-950 font-extrabold">{devOtp}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtp(devOtp);
                  toast.info("Auto-filled demo verification code!");
                }}
                className="rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold px-2.5 py-1 text-[11px] transition-colors cursor-pointer shrink-0"
              >
                Auto-fill
              </button>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="reset-otp">{t("auth_enter_otp") || "6-Digit Verification Code"} *</Label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-otp"
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="pl-11 tracking-widest font-mono text-base font-bold"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-password">{t("auth_new_password") || "New Password"} *</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Password strength visual meter */}
              {newPassword && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Strength:</span>
                    <span className={`font-bold ${pwStrength.color}`}>{pwStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${pwStrength.color.split(" ")[1] || "bg-primary"}`}
                      style={{ width: pwStrength.percent }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm-password">{t("auth_confirm_password") || "Confirm New Password"} *</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="px-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <p
                  className={`text-[11px] font-semibold flex items-center gap-1 ${
                    newPassword === confirmPassword ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {newPassword === confirmPassword ? (
                    <>
                      <Check className="h-3 w-3" /> Passwords match
                    </>
                  ) : (
                    "Passwords do not match"
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Didn't receive the code?</span>
              <button
                type="button"
                disabled={resendCooldown > 0 || busy}
                onClick={handleResendOtp}
                className={`font-bold transition-colors cursor-pointer ${
                  resendCooldown > 0
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-primary hover:underline"
                }`}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>

            <Button
              type="submit"
              variant={isGov ? "navy" : "hero"}
              size="xl"
              className="w-full mt-2"
              disabled={busy}
            >
              {busy ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>{t("auth_reset_password") || "Reset Password"}</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link
              to={`/login${isGov ? "?portal=gov" : ""}`}
              className="font-bold text-slate-600 hover:text-slate-900 hover:underline"
            >
              Cancel and return to Login
            </Link>
          </p>
        </div>
      )}

      {/* ================= STEP 3: SUCCESS ================= */}
      {step === 3 && (
        <div className="text-center py-6 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-navy">Password Reset Successfully!</h2>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-xs mx-auto">
              Your password has been securely updated. You can now log into your account using your new credentials.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant={isGov ? "navy" : "hero"}
              size="xl"
              className="w-full"
              onClick={() => navigate(`/login${isGov ? "?portal=gov" : ""}`)}
            >
              <span>{t("nav_login") || "Proceed to Login"}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

export default ForgotPassword;
