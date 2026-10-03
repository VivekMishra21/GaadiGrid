import { SignupScreen } from "@/components/site/signup-screen";

export const metadata = {
  title: "Sign up",
  description: "Create your GaadiGrid account in minutes: verify your mobile number with a one-time code and you're in.",
};

// No site header here: the hero carries the logo, so the page reads as one full-bleed split screen.
export default function SignupPage() {
  return <SignupScreen />;
}
