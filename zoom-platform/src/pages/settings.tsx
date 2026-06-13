import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ProtectedLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { User, Building2, Phone, Briefcase } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", companyName: "", jobTitle: "", phone: "" },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        companyName: user.companyName || "",
        jobTitle: user.jobTitle || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const mutation = useUpdateProfile();

  function onSubmit(data: FormValues) {
    mutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile saved", description: "Your info will appear in future meeting emails." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: () => toast({ title: "Save failed", variant: "destructive" }),
    });
  }

  const watched = form.watch();

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Your profile details appear in all meeting emails as the sender signature.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
            {/* Section: Identity */}
            <div className="p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Identity</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="name" className="pl-10 h-11 bg-gray-50 border-gray-200" placeholder="Jane Smith" {...form.register("name")} />
                  </div>
                  {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">Job Title</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="jobTitle" className="pl-10 h-11 bg-gray-50 border-gray-200" placeholder="Sales Manager" {...form.register("jobTitle")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="phone" className="pl-10 h-11 bg-gray-50 border-gray-200" placeholder="+1 (555) 000-0000" {...form.register("phone")} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Company */}
            <div className="p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Company</h2>
              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="companyName" className="pl-10 h-11 bg-gray-50 border-gray-200" placeholder="Acme Corp" {...form.register("companyName")} />
                </div>
              </div>
            </div>

            {/* Email Signature Preview */}
            <div className="p-6 bg-gray-50 rounded-b-xl">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Email Signature Preview</h2>
              <div className="bg-white border border-gray-200 rounded-lg p-5 text-sm">
                <div className="border-t-2 border-gray-100 pt-4 space-y-0.5">
                  {watched.name && (
                    <p className="font-bold text-gray-900">{watched.name}</p>
                  )}
                  {watched.jobTitle && watched.companyName && (
                    <p className="text-gray-500">{watched.jobTitle} &bull; {watched.companyName}</p>
                  )}
                  {watched.jobTitle && !watched.companyName && (
                    <p className="text-gray-500">{watched.jobTitle}</p>
                  )}
                  {!watched.jobTitle && watched.companyName && (
                    <p className="font-semibold text-gray-700">{watched.companyName}</p>
                  )}
                  <p className="text-blue-600">{user?.email}</p>
                  {watched.phone && (
                    <p className="text-gray-500">{watched.phone}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">This exact block appears at the bottom of every email you send.</p>
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <Button type="submit" disabled={mutation.isPending} className="min-w-[130px] h-11 font-semibold">
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedLayout>
  );
}
