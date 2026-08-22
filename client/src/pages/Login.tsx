import { useState } from "react";
import { Navigate } from "react-router-dom";
import LoginForm from "../components/LoginForm.js";
import RegisterForm from "../components/RegisterForm.js";
import { useAuth } from "../context/AuthContext.js";

export default function Login() {
  const {
    user,
    loading: authLoading,
    login,
    register,
  } = useAuth();

  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center dark:text-white">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  async function handleLogin(
    email: string,
    password: string
  ) {
    try {
      setLoading(true);
      setError("");
      await login(email, password);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) {
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await register(name, email, password);
      setShowRegister(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to register."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6 dark:bg-gray-900">
      <div className="w-full max-w-lg">
        {showRegister ? (
          <RegisterForm
            loading={loading}
            error={error}
            onSubmit={handleRegister}
          />
        ) : (
          <LoginForm
            loading={loading}
            error={error}
            onSubmit={handleLogin}
          />
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() =>
              setShowRegister(!showRegister)
            }
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {showRegister
              ? "Already have an account? Sign In"
              : "Create a new account"}
          </button>
        </div>
      </div>
    </div>
  );
}
