import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  SearchCheck,
  Timer,
  Building2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  MapPin,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";

const STEP_NAMES = ["Basic Info", "Contact Details", "Create Password"];

// Field-level validator
const validateField = (fieldName, value, allValues = {}) => {
  switch (fieldName) {
    case "name": {
      const v = (value || "").trim();
      if (!v) return "Full name is required";
      if (v.length < 3) return "Name must be at least 3 characters";
      if (v.length > 60) return "Name cannot exceed 60 characters";
      if (!/^[a-zA-Z\s.'-]+$/.test(v)) return "Name can only contain letters, spaces, and hyphens";
      if (v.split(/\s+/).length < 2) return "Please enter both first and last name (e.g. Ramesh Sharma)";
      return "";
    }
    case "phone": {
      const v = (value || "").trim();
      if (!v) return "Mobile number is required";
      // Remove spaces, hyphens, and leading +91 / 0
      const clean = v.replace(/[\s-]/g, "").replace(/^(?:\+91|0)/, "");
      if (!/^\d+$/.test(clean)) return "Phone number must contain only numbers";
      if (clean.length !== 10) {
        return `Mobile number must be exactly 10 digits (currently ${clean.length} digits)`;
      }
      if (!/^[6-9]/.test(clean)) {
        return "Mobile number should start with 6, 7, 8, or 9";
      }
      return "";
    }
    case "email": {
      const v = (value || "").trim();
      if (!v) return "Email address is required";
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) {
        return "Enter a valid email address (e.g. name@example.com)";
      }
      return "";
    }
    case "address": {
      const v = (value || "").trim();
      if (!v) return "Complete address / ward is required";
      if (v.length < 5) return "Please enter your locality/ward (at least 5 characters)";
      if (v.length > 200) return "Address cannot exceed 200 characters";
      return "";
    }
    case "password": {
      const v = value || "";
      if (!v) return "Password is required";
      if (v.length < 8) return "Password must be at least 8 characters";
      if (!/\d/.test(v)) return "Password must include at least one number";
      if (!/[a-z]/.test(v) || !/[A-Z]/.test(v)) {
        return "Password must include both uppercase and lowercase letters";
      }
      return "";
    }
    case "confirm": {
      const v = value || "";
      if (!v) return "Please confirm your password";
      if (v !== allValues.password) return "Passwords do not match";
      return "";
    }
    default:
      return "";
  }
};

// Calculate password strength
const getPasswordStrength = (pwd = "") => {
  if (!pwd) return { score: 0, label: "", color: "", percent: "0%" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-600", percent: "25%" };
  if (score === 3) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-600", percent: "50%" };
  if (score === 4) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-600", percent: "75%" };
  return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-600", percent: "100%" };
};

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
    confirm: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    email: false,
    address: false,
    password: false,
    confirm: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [agreeTouched, setAgreeTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  // Field change handler with live validation
  const handleChange = (key) => (e) => {
    const val = e.target.value;
    const nextForm = { ...formData, [key]: val };
    setFormData(nextForm);

    if (touched[key]) {
      const err = validateField(key, val, nextForm);
      setErrors((prev) => ({ ...prev, [key]: err }));
    }

    // Live update confirm password matching if password changes
    if (key === "password" && touched.confirm) {
      const confirmErr = validateField("confirm", formData.confirm, nextForm);
      setErrors((prev) => ({ ...prev, confirm: confirmErr }));
    }
  };

  // Field blur handler
  const handleBlur = (key) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const err = validateField(key, formData[key], formData);
    setErrors((prev) => ({ ...prev, [key]: err }));
  };

  // Rules list for step 2
  const passwordRules = [
    { ok: formData.password.length >= 8, text: "At least 8 characters" },
    { ok: /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password), text: "Uppercase and lowercase letters" },
    { ok: /\d/.test(formData.password), text: "At least one number (0-9)" },
  ];

  const strength = getPasswordStrength(formData.password);

  // Step validation
  const validateStep = (currentStep) => {
    const stepErrors = {};
    if (currentStep === 0) {
      const nameErr = validateField("name", formData.name, formData);
      if (nameErr) stepErrors.name = nameErr;
    } else if (currentStep === 1) {
      const phoneErr = validateField("phone", formData.phone, formData);
      const emailErr = validateField("email", formData.email, formData);
      const addressErr = validateField("address", formData.address, formData);
      if (phoneErr) stepErrors.phone = phoneErr;
      if (emailErr) stepErrors.email = emailErr;
      if (addressErr) stepErrors.address = addressErr;
    } else if (currentStep === 2) {
      const passErr = validateField("password", formData.password, formData);
      const confirmErr = validateField("confirm", formData.confirm, formData);
      if (passErr) stepErrors.password = passErr;
      if (confirmErr) stepErrors.confirm = confirmErr;
    }

    return stepErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(step);

    // Mark current step fields as touched
    if (step === 0) {
      setTouched((prev) => ({ ...prev, name: true }));
    } else if (step === 1) {
      setTouched((prev) => ({ ...prev, phone: true, email: true, address: true }));
    }

    setErrors((prev) => ({ ...prev, ...stepErrors }));

    if (Object.keys(stepErrors).length > 0) {
      const firstError = Object.values(stepErrors)[0];
      toast.error(firstError);
      return;
    }

    setStep((prev) => prev + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      name: true,
      phone: true,
      email: true,
      address: true,
      password: true,
      confirm: true,
    });
    setAgreeTouched(true);

    const allErrors = {
      ...validateStep(0),
      ...validateStep(1),
      ...validateStep(2),
    };

    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      const firstError = Object.values(allErrors)[0];
      toast.error(firstError);
      return;
    }

    if (!agree) {
      toast.error("Please agree to the civic terms and guidelines to continue.");
      return;
    }

    setBusy(true);
    try {
      const cleanPhone = formData.phone.trim().replace(/[\s-]/g, "");
      await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: cleanPhone,
        address: formData.address.trim(),
        role: "client",
      });

      toast.success("Account created successfully! Welcome to Smart Grievance.");
      navigate("/citizen/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      subtitle="Citizen Portal"
      title="Create Your Account"
      copy="Join the civic portal and report, track, and resolve local issues together."
      features={[
        { icon: SearchCheck, t: "Report Civic Issues", d: "Upload photos and precise location" },
        { icon: Timer, t: "Track in Real Time", d: "Get transparent status updates" },
        { icon: Building2, t: "Make a Better City", d: "Collaborate with local authorities" },
      ]}
      quote="A cleaner today, a brighter tomorrow."
    >
      {/* Progress Steps Header */}
      <div className="mb-6 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
        <div className="flex items-center justify-between">
          {STEP_NAMES.map((name, i) => (
            <div key={name} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all ${
                  i < step
                    ? "bg-emerald-600 text-white shadow-xs"
                    : i === step
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-xs"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`text-[11px] tracking-tight ${
                  i === step
                    ? "font-extrabold text-primary"
                    : i < step
                    ? "font-semibold text-emerald-700"
                    : "font-medium text-slate-400"
                }`}
              >
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* ================= STEP 0: BASIC INFORMATION ================= */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md mb-1">
                Step 1 of 3
              </span>
              <h2 className="text-xl font-extrabold text-navy">Personal Information</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Please tell us your official full name</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-name"
                  value={formData.name}
                  onChange={handleChange("name")}
                  onBlur={handleBlur("name")}
                  placeholder="e.g. Ramesh Kumar Sharma"
                  className={`pl-10 ${
                    touched.name && errors.name
                      ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20"
                      : touched.name && !errors.name && formData.name
                      ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                      : ""
                  }`}
                  required
                />
                {touched.name && !errors.name && formData.name && (
                  <CheckCircle2 className="absolute right-3.5 top-3.5 h-4 w-4 text-emerald-600" />
                )}
              </div>
              {touched.name && errors.name ? (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.name}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Enter your first and last name as per official records</p>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 1: CONTACT DETAILS ================= */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md mb-1">
                Step 2 of 3
              </span>
              <h2 className="text-xl font-extrabold text-navy">Contact & Locality</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Used for grievance updates, verification, and field routing</p>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Mobile Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-phone"
                  type="tel"
                  maxLength={15}
                  value={formData.phone}
                  onChange={handleChange("phone")}
                  onBlur={handleBlur("phone")}
                  placeholder="9876543210"
                  className={`pl-10 ${
                    touched.phone && errors.phone
                      ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20"
                      : touched.phone && !errors.phone && formData.phone
                      ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                      : ""
                  }`}
                  required
                />
                {touched.phone && !errors.phone && formData.phone && (
                  <CheckCircle2 className="absolute right-3.5 top-3.5 h-4 w-4 text-emerald-600" />
                )}
              </div>
              {touched.phone && errors.phone ? (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">10-digit mobile number for SMS notifications and officer calls</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  onBlur={handleBlur("email")}
                  placeholder="name@example.com"
                  className={`pl-10 ${
                    touched.email && errors.email
                      ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20"
                      : touched.email && !errors.email && formData.email
                      ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                      : ""
                  }`}
                  required
                />
                {touched.email && !errors.email && formData.email && (
                  <CheckCircle2 className="absolute right-3.5 top-3.5 h-4 w-4 text-emerald-600" />
                )}
              </div>
              {touched.email && errors.email ? (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Used for portal login and formal resolution notices</p>
              )}
            </div>

            {/* Address / Ward */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-address">Complete Address / Ward *</Label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-address"
                  value={formData.address}
                  onChange={handleChange("address")}
                  onBlur={handleBlur("address")}
                  placeholder="e.g. Sector 14, Main Road, Sasaram or Ward 4"
                  className={`pl-10 ${
                    touched.address && errors.address
                      ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20"
                      : touched.address && !errors.address && formData.address
                      ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                      : ""
                  }`}
                  required
                />
                {touched.address && !errors.address && formData.address && (
                  <CheckCircle2 className="absolute right-3.5 top-3.5 h-4 w-4 text-emerald-600" />
                )}
              </div>
              {touched.address && errors.address ? (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.address}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Helps auto-tag your local municipal zone and department queue</p>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 2: PASSWORD & SECURITY ================= */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md mb-1">
                Step 3 of 3
              </span>
              <h2 className="text-xl font-extrabold text-navy">Set Secure Password</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Protect your citizen portal access</p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  placeholder="Create a strong password"
                  className={`pl-10 pr-10 ${
                    touched.password && errors.password
                      ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20"
                      : touched.password && !errors.password && formData.password
                      ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                      : ""
                  }`}
                  required
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
              {touched.password && errors.password && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.password}</span>
                </p>
              )}

              {/* Password strength bar */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Password Strength:</span>
                    <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.percent }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-confirm">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-confirm"
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirm}
                  onChange={handleChange("confirm")}
                  onBlur={handleBlur("confirm")}
                  placeholder="Repeat your password"
                  className={`pl-10 pr-10 ${
                    touched.confirm && errors.confirm
                      ? "border-red-500 focus-visible:ring-red-500/20 bg-red-50/20"
                      : touched.confirm && !errors.confirm && formData.confirm
                      ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                      : ""
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.confirm && errors.confirm && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.confirm}</span>
                </p>
              )}
            </div>

            {/* Requirements checklist */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-navy text-[11px] uppercase tracking-wider">Password Requirements:</p>
              {passwordRules.map((r) => (
                <div key={r.text} className="flex items-center gap-2">
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                      r.ok ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={r.ok ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                    {r.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Terms checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked);
                    setAgreeTouched(true);
                  }}
                  className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>
                  I agree to the <span className="font-semibold text-primary underline">Civic Redressal Terms</span> and accept responsibility for providing authentic grievance information.
                </span>
              </label>
              {agreeTouched && !agree && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>You must agree to the terms to proceed.</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="flex-1 font-bold"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}

          {step < 2 ? (
            <Button
              type="button"
              variant="hero"
              size="xl"
              className="flex-1 font-bold"
              onClick={handleNext}
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="flex-1 font-bold"
              disabled={busy}
            >
              {busy ? "Creating Account…" : "Register Account"}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

export default Register;
