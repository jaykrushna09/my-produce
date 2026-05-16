
import { LoginForm } from '@/components/auth/login-form';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'vault-hero');

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      {/* Decorative Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Brand Story (Visible on Desktop) */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 pr-8">
          <div className="space-y-4">
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              Identity Infrastructure v4.0
            </span>
            <h2 className="text-5xl xl:text-6xl font-headline font-bold text-white leading-tight">
              Fortifying the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Digital Frontier</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-lg">
              Vantage Vault provides state-of-the-art identity bridges with real-time AI security auditing and elastic scalability.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="p-4 rounded-xl glass border-white/5">
              <p className="text-2xl font-bold text-white">99.9%</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Uptime SLA</p>
            </div>
            <div className="p-4 rounded-xl glass border-white/5">
              <p className="text-2xl font-bold text-white">AI-Driven</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Strength Audit</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center lg:left-8 lg:translate-x-0 lg:text-left">
        <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase">
          &copy; 2024 Vantage Vault Systems &bull; SECURED BY AES-256
        </p>
      </div>
    </main>
  );
}
