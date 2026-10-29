import LandingPage from '@/components/landing-page';
import { demoMode } from '@/lib/server';
export default function Page() {
  return <LandingPage demo={demoMode()} />;
}
