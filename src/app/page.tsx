import { LoginForm } from '@/components/auth/login-form';
import { Leaf } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side: Brand Identity */}
      <div className="flex-1 bg-anflocor-green flex flex-col items-center justify-center p-8 text-white">
        <div className="space-y-6 text-center">
          <p className="text-xl font-medium tracking-wide">Welcome!</p>
          <div className="flex flex-col items-center space-y-2">
            <Leaf className="h-24 w-24" strokeWidth={1.5} />
            <h1 className="text-6xl md:text-7xl font-bold tracking-tighter">
              ANFLOCOR
            </h1>
          </div>
        </div>
      </div>

      {/* Right Side: Login Interaction */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}