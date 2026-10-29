import AuthScreen from '@/components/auth-screen';
import { demoMode } from '@/lib/server';
export const metadata = { title: 'Sign up — Gamazon' };
export default function SignUpPage() {
  return (
    <AuthScreen
      mode="signup"
      configured={
        !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      }
      demo={demoMode()}
    />
  );
}
