import React from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterForm({
  setInsight,
}: {
  setInsight?: (msg: string) => void;
}) {
  // here are two
  // separating lines:
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setInsight?.("Creating your account...");

    setTimeout(() => {
      navigate("/career");
    }, 300);
  };

  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (name.length > 0) {
      setInsight?.(`Welcome, ${name}. Let's get you set up.`);
    } else {
      setInsight?.("Insights will appear here");
    }
  };

  const handleEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    if (email.length > 0) {
      setInsight?.("We'll use this to keep your progress synced.");
    }
  };

  const handlePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    if (pwd.length > 0) {
      setInsight?.("Strong foundation. Strong performance.");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create your account</h1>

      {/* FIX: add onSubmit here */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Full name"
          onChange={handleName}
          className="w-full border rounded-lg px-4 py-2"
        />

        <input
          type="email"
          placeholder="Email"
          onChange={handleEmail}
          className="w-full border rounded-lg px-4 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          onChange={handlePassword}
          className="w-full border rounded-lg px-4 py-2"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold"
        >
          Register
        </button>
      </form>
    </div>
  );
}
