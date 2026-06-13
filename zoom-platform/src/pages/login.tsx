import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Video, Mail, Lock } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setToken } = useAuth();
  const { toast } = useToast();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const mutation = useLogin();

  function onSubmit(data: FormValues) {
    mutation.mutate({ data }, {
      onSuccess: (res) => { setToken(res.token); setLocation("/dashboard"); },
      onError: (err: any) => toast({ title: "Login failed", description: err?.data?.error || "Invalid credentials", variant: "destructive" }),
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gray-900 p-12 text-white">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Video className="w-6 h-6 text-blue-400" />
          MeetingSync
        </div>
        <div>
          <blockquote className="text-2xl font-light leading-relaxed text-gray-200 mb-6">
            "Scheduling meetings used to take 20 minutes. Now it's 30 seconds."
          </blockquote>
          <p className="text-gray-400 text-sm">— Agency owner, using MeetingSync daily</p>
        </div>
        <p className="text-gray-600 text-xs">© {new Date().getFullYear()} MeetingSync</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 text-xl font-bold text-gray-900 mb-8">
            <Video className="w-6 h-6 text-blue-600" /> MeetingSync
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to your account to continue</p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" type="email" className="pl-10 h-11 bg-white border-gray-200" placeholder="you@example.com" {...form.register("email")} />
              </div>
              {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" type="password" className="pl-10 h-11 bg-white border-gray-200" placeholder="••••••••" {...form.register("password")} />
              </div>
              {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11 font-semibold text-sm mt-2" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
