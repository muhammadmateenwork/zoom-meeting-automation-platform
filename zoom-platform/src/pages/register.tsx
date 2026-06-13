import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Video, Mail, Lock, User } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: setToken } = useAuth();
  const { toast } = useToast();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "" } });
  const mutation = useRegister();

  function onSubmit(data: FormValues) {
    mutation.mutate({ data }, {
      onSuccess: (res) => { setToken(res.token); setLocation("/dashboard"); },
      onError: (err: any) => toast({ title: "Registration failed", description: err?.data?.error || "Could not create account", variant: "destructive" }),
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
        <div className="space-y-6">
          {[
            { step: "01", label: "Create your account", desc: "Takes under 30 seconds." },
            { step: "02", label: "Set up your profile", desc: "Add your name, company, and title for email signatures." },
            { step: "03", label: "Schedule your first meeting", desc: "Zoom link generated, invite sent — automatically." },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex gap-4">
              <span className="text-blue-400 font-mono text-sm font-bold mt-0.5">{step}</span>
              <div>
                <p className="font-semibold text-white">{label}</p>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs">© {new Date().getFullYear()} MeetingSync</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 text-xl font-bold text-gray-900 mb-8">
            <Video className="w-6 h-6 text-blue-600" /> MeetingSync
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an account</h1>
          <p className="text-sm text-gray-500 mb-8">Free to use. No credit card required.</p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="name" className="pl-10 h-11 bg-white border-gray-200" placeholder="Jane Smith" {...form.register("name")} />
              </div>
              {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="email" type="email" className="pl-10 h-11 bg-white border-gray-200" placeholder="jane@company.com" {...form.register("email")} />
              </div>
              {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="password" type="password" className="pl-10 h-11 bg-white border-gray-200" placeholder="Min. 6 characters" {...form.register("password")} />
              </div>
              {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11 font-semibold text-sm mt-2" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
