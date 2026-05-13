"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { loginSchema, signupSchema } from "@/lib/validations/inquiry";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      // Validate form data
      const schema = isLogin ? loginSchema : signupSchema;
      const result = schema.safeParse(formData);

      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFieldErrors(errors);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
            },
          },
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex bg-[var(--bg-base)] relative overflow-hidden"
      style={{
        backgroundImage: `url('/loginimage.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Background blobs for depth */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-100/50 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-primary-100/30 rounded-full blur-[100px] -z-10" />

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-3/5 bg-transparent relative overflow-hidden items-center justify-center">
        {/* Subtle texture for premium feel - dark stroke for light bg */}
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 30L0 0M30 0L0 30M60 60L30 30M60 30L30 60' stroke='%23cbd5e1' stroke-width='1'/%3E%3C/svg%3E")`,
        }} />

          <div className="relative z-10 flex flex-col justify-center px-24 py-12 w-full h-full max-w-4xl text-white">
          {/* Logo - Increased Size */}
          <div className="mb-12 transition-all duration-700 animate-in fade-in slide-in-from-left-8 text-center lg:text-left">
            <div className="relative w-[340px] h-[120px] -ml-2">
              <Image
                src="/Serendia.png"
                alt="TravX Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* New Creative Content - Summary */}
            <div className="space-y-8 animate-in fade-in slide-in-from-left-12 duration-700 delay-200 leading-relaxed font-light text-lg">
            <p className="border-l-4 border-primary-600 pl-6 text-xl text-white font-medium">
              Established in 2019, <strong className="text-primary-300">TravX Travel Management</strong> is a premier travel management company specializing in bespoke round trips across Sri Lanka & Maldives.
            </p>

            <div className="pl-6 space-y-4">
              <p>
                From leisure stays to exclusive cricket tours, we cater to global markets including Europe, Australia, and the UK. Combining hospitality expertise with seamless logistics, we ensure every journey is crafted to perfection.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm font-semibold text-white shadow-sm">Itinerary Planning</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm font-semibold text-white shadow-sm">Hotel Bookings</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm font-semibold text-white shadow-sm">Ground Transport</span>
                <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm font-semibold text-white shadow-sm">Tourism</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form Container */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 lg:p-16 relative">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-700">
          <div className="lg:hidden flex justify-center mb-12">
            <div className="relative w-48 h-16">
              <Image
                src="/Serendia.png"
                alt="TravX Logo"
                fill
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
          </div>

          <div className="relative">
            {/* Form Glass Block */}
            <div className="bg-[var(--bg-surface)] rounded-[2rem] p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-[var(--border-default)] relative z-10 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-500 to-primary-600" />

              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-surface-900 light:text-surface-900 tracking-tight mb-2">
                  {isLogin ? "Welcome back" : "Get Started"}
                </h2>
                <p className="text-surface-500 font-medium">
                  {isLogin
                    ? "Sign in to your operation center"
                    : "Create your agent account today"}
                </p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs font-semibold text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-surface-600 uppercase tracking-widest ml-1">Full Name</label>
                    <Input
                      name="full_name"
                      type="text"
                      placeholder="Enter your name"
                      value={formData.full_name}
                      onChange={handleChange}
                      error={fieldErrors.full_name}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-widest ml-1">Work Email</label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    error={fieldErrors.email}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-widest ml-1">Secure Password</label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    error={fieldErrors.password}
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/20 py-6 text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isLogin ? "Sign In Securely" : "Create My Account"}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-surface-200 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setFieldErrors({});
                  }}
                  className="text-sm text-surface-500 font-medium hover:text-primary-600 transition-colors"
                >
                  {isLogin
                    ? "Don't have an account? "
                    : "Have an account already? "}
                  <span className="text-primary-600 font-bold underline underline-offset-4 decoration-primary-200 hover:decoration-primary-600">
                    {isLogin ? "Sign up now" : "Go to login"}
                  </span>
                </button>
              </div>
            </div>

            {/* Background design elements for form */}
            <div className="absolute top-[-2%] right-[-2%] w-24 h-24 bg-primary-200 rounded-full blur-3xl opacity-40 -z-0" />
            <div className="absolute bottom-[-2%] left-[-2%] w-32 h-32 bg-primary-200 rounded-full blur-3xl opacity-30 -z-0" />
          </div>

          <p className="mt-12 text-center text-xs text-slate-400 font-medium">
            &copy; {new Date().getFullYear()} TravX Travel Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
