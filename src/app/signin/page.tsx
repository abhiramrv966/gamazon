import AuthScreen from '@/components/auth-screen';
import { demoMode } from '@/lib/server';
export const metadata = { title: 'Sign in — Gamazon' };
export default function SignInPage() {
  return (
    <AuthScreen
      mode="signin"
      configured={
        !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      }
      demo={demoMode()}
    />
  );
}
