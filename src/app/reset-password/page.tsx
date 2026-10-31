import AuthScreen from '@/components/auth-screen';
import { demoMode } from '@/lib/server';

export const metadata = { title: 'Reset password — Gamazon' };

export default function ResetPasswordPage() {
  return (
    <AuthScreen
      mode="recovery"
      configured={
        !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      }
      demo={demoMode()}
    />
  );
}
