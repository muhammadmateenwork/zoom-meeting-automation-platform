import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Video, Mail, Clock, Shield, Zap, CalendarCheck } from "lucide-react";

const features = [
  { icon: Zap, title: "Instant Zoom Links", desc: "Meeting links auto-generated via Zoom API the moment you schedule." },
  { icon: Mail, title: "Smart Email Invites", desc: "Branded invitations with your name, title, company and phone sent automatically." },
  { icon: Clock, title: "Auto Reminders", desc: "24-hour and 1-hour reminders sent to attendees — zero manual effort." },
  { icon: CalendarCheck, title: "Reschedule & Cancel", desc: "Change meeting times or cancel with a reason. Attendees get notified instantly." },
  { icon: Shield, title: "CC & BCC Support", desc: "Keep your team looped in with full CC and BCC on every outgoing email." },
  { icon: Video, title: "Host & Guest Links", desc: "Separate start (host) and join (guest) links for clean meeting management." },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-blue-50/60 to-white">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
          <Zap className="w-3.5 h-3.5" /> Zoom Meeting Automation
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 max-w-3xl leading-tight mb-6">
          Schedule meetings.<br className="hidden md:block" />
          <span className="text-blue-600">Automate everything else.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
          Create Zoom meetings, send professional invitations, and automate reminders — all from one clean dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-md">
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-t py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Everything you need</h2>
          <p className="text-center text-gray-500 mb-12">Designed for consultants, agencies, and freelancers.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl border border-gray-100 bg-gray-50 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Ready to get started?</h2>
        <p className="text-blue-100 mb-8">Free to use. No credit card required.</p>
        <Link href="/register">
          <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold">
            Create Your Account
          </Button>
        </Link>
      </section>
    </PublicLayout>
  );
}
