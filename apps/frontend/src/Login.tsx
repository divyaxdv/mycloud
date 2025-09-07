import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // Add error state
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Reset error before login
    try {
      const response = await fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", JSON.stringify(data.user.name));
        navigate("/");
      } else {
        setError(
          data.message || "Login failed. Please check your credentials."
        ); // Set error message
      }
    } catch (error) {
      setError("Network error. Please try again."); // Set network error
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white">
      <form
        onSubmit={handleLogin}
        className="bg-white/10 p-8 rounded-2xl shadow-lg w-96"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">Login </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded">{error}</div>
        )}
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 rounded bg-white/20 text-white placeholder-gray-300"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 rounded bg-white/20 text-white placeholder-gray-300"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 p-3 rounded font-semibold transition"
        >
          Login
        </button>

        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="w-full mt-4 bg-red-500 hover:bg-red-600 p-3 rounded font-semibold transition"
        >
          Signup
        </button>
        <button
          type="button"
          className="w-full mt-4 bg-red-500 hover:bg-red-600 p-3 rounded font-semibold transition"
          onClick={() =>
            (window.location.href = "http://localhost:5001/api/auth/google")
          }
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
