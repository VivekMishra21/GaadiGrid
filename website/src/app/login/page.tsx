import { LoginScreen } from "@/components/site/login-screen";

export const metadata = {
  title: "Log in",
  description: "Log in to GaadiGrid with a one-time code sent to your mobile number.",
};

// Same full-bleed split screen as /signup: the hero carries the logo, so no site header here.
export default function LoginPage() {
  return <LoginScreen />;
}
