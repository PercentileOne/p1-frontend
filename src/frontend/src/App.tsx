import { Routes, Route } from "react-router-dom";
import AuthLayout from "./Layouts/AuthLayout";
import RegisterForm from "./features/auth/RegisterForm";
import CareerSelectForm from "./features/auth/CareerSelectForm";
import { OnboardingPercentileStep } from "./pages/OnboardingPercentileStep";
import LifestylePage from "./pages/LifestylePage"; // or whatever your file is called
import ExplorerPage from "./pages/ExplorerPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthLayout>
            <RegisterForm />
          </AuthLayout>
        }
      />
      <Route path="/explorer" element={<ExplorerPage />} />

      <Route
        path="/career"
        element={
          <AuthLayout>
            <CareerSelectForm />
          </AuthLayout>
        }
      />

      <Route
        path="/percentile"
        element={
          <AuthLayout>
            <OnboardingPercentileStep />
          </AuthLayout>
        }
      />

      <Route
        path="/lifestyle"
        element={
          <AuthLayout>
            <LifestylePage />
          </AuthLayout>
        }
      />
    </Routes>
  );
}
