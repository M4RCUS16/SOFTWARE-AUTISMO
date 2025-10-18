import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/use-auth";
import api from "@/services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    email: "",
    password: "",
    crp: "",
    profession: "",
    institution: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerErrors, setRegisterErrors] = useState({});

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError("Credenciais invalidas. Verifique e tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
    setRegisterErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateRegisterForm = () => {
    const errors = {};
    if (!registerForm.full_name.trim()) {
      errors.full_name = "Informe o nome completo.";
    }
    if (!registerForm.email.trim()) {
      errors.email = "Informe um e-mail profissional válido.";
    }
    if (!registerForm.password || registerForm.password.length < 10) {
      errors.password = "A senha deve ter pelo menos 10 caracteres.";
    }
    if (!registerForm.crp.trim()) {
      errors.crp = "Informe o registro profissional (CRP ou equivalente).";
    }
    if (!registerForm.profession) {
      errors.profession = "Selecione a área de atuação.";
    }
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!validateRegisterForm()) {
      setError("Revise os campos destacados antes de prosseguir.");
      return;
    }
    setRegisterLoading(true);
    setRegisterSuccess("");
    setError("");
    setRegisterErrors({});
    try {
      await api.post("/auth/register/", registerForm);
      setRegisterSuccess("Cadastro realizado com sucesso! Faça login com suas credenciais.");
      setIsRegistering(false);
      setForm({ email: registerForm.email, password: "" });
      setRegisterForm({
        full_name: "",
        email: "",
        password: "",
        crp: "",
        profession: "",
        institution: ""
      });
    } catch (err) {
      const payload = err.response?.data;
      const fieldErrors = {};
      let globalMessage = "Não foi possível concluir o cadastro. Confira os dados informados.";

      if (payload) {
        if (typeof payload === "string") {
          globalMessage = payload;
        } else if (Array.isArray(payload)) {
          globalMessage = payload.join(" ");
        } else if (typeof payload === "object") {
          if (payload.detail) {
            globalMessage = Array.isArray(payload.detail) ? payload.detail.join(" ") : String(payload.detail);
          }
          Object.entries(payload).forEach(([field, messages]) => {
            if (field === "detail") {
              return;
            }
            const messageArray = Array.isArray(messages) ? messages : [messages];
            fieldErrors[field] = messageArray.join(" ");
          });
          if (Object.keys(fieldErrors).length > 0 && (!payload.detail || payload.detail.length === 0)) {
            globalMessage = Object.values(fieldErrors)[0];
          }
        }
      }

      if (fieldErrors.email && fieldErrors.email.toLowerCase().includes("already")) {
        fieldErrors.email = "Este e-mail já está cadastrado. Utilize outro para registrar-se.";
        globalMessage = fieldErrors.email;
      }

      setRegisterErrors(fieldErrors);
      setError(globalMessage);
    } finally {
      setRegisterLoading(false);
    }
  };

  const professions = [
    { value: "psychologist", label: "Psicóloga" },
    { value: "psychopedagogist", label: "Psicopedagoga" }
  ];

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-primary-light to-white px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-widest text-primary">Suite NeuroAtlas TEA</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-800">Acesse sua conta profissional</h1>
          <p className="mt-2 text-sm text-slate-500">Ambiente seguro para psicólogas e psicopedagogas</p>
        </div>
        {registerSuccess && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{registerSuccess}</p>}
        {isRegistering ? (
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-medium text-slate-600">Nome completo</label>
              <input
                type="text"
                name="full_name"
                value={registerForm.full_name}
                onChange={handleRegisterChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {registerErrors.full_name && <p className="mt-1 text-sm text-red-500">{registerErrors.full_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">E-mail profissional</label>
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {registerErrors.email && <p className="mt-1 text-sm text-red-500">{registerErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Senha (mínimo 10 caracteres)</label>
              <input
                type="password"
                name="password"
                value={registerForm.password}
                onChange={handleRegisterChange}
                required
                minLength={10}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {registerErrors.password && <p className="mt-1 text-sm text-red-500">{registerErrors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">CRP / Registro profissional</label>
              <input
                type="text"
                name="crp"
                value={registerForm.crp}
                onChange={handleRegisterChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {registerErrors.crp && <p className="mt-1 text-sm text-red-500">{registerErrors.crp}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Área de atuação</label>
              <select
                name="profession"
                value={registerForm.profession}
                onChange={handleRegisterChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Selecione</option>
                {professions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {registerErrors.profession && <p className="mt-1 text-sm text-red-500">{registerErrors.profession}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Instituição (opcional)</label>
              <input
                type="text"
                name="institution"
                value={registerForm.institution}
                onChange={handleRegisterChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {registerErrors.institution && <p className="mt-1 text-sm text-red-500">{registerErrors.institution}</p>}
            </div>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={registerLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {registerLoading ? "Registrando..." : "Concluir cadastro"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError("");
              }}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Já possuo conta
            </button>
          </form>
        ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-600">E-mail profissional</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Senha</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setError("");
              setRegisterSuccess("");
            }}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Ainda não tenho cadastro
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
