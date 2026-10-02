import { Header } from "@/components/site/header";
import { LoginScreen } from "@/components/site/login-screen";

export const metadata = {
  title: "Log in",
  description: "Log in or sign up to GaadiGrid with a one-time code sent to your mobile number.",
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <LoginScreen />
    </>
  );
}
