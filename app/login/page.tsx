"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("Chargement...");

    if (isSignUp) {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) return setMessage("❌ Erreur : " + authError.message);

      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert([{ id: authData.user.id, company_name: companyName }]);
        if (profileError) setMessage("❌ Erreur profil : " + profileError.message);
        else {
          setMessage("✅ Inscription réussie ! Tu peux te connecter.");
          setIsSignUp(false);
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("❌ Erreur : Identifiants incorrects.");
      else window.location.href = "/"; // Redirige vers l'accueil une fois connecté
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center mb-6 text-gray-800">
          {isSignUp ? "Créer un compte" : "Connexion"}
        </h1>
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium mb-1">Nom de ton entreprise</label>
              <input type="text" required className="w-full border rounded-lg p-2" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input type="email" required className="w-full border rounded-lg p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
            <input type="password" required className="w-full border rounded-lg p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">
            {isSignUp ? "S'inscrire" : "Se connecter"}
          </button>
        </form>
        {message && <p className="mt-4 text-center font-medium text-sm text-red-600">{message}</p>}
        <p className="mt-6 text-center text-sm text-gray-500">
          {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}
          <button onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }} className="ml-2 text-red-600 font-bold hover:underline">
            {isSignUp ? "Se connecter" : "S'inscrire"}
          </button>
        </p>
      </div>
    </main>
  );
}