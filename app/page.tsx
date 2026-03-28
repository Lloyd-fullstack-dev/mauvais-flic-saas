"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Les boîtes pour le formulaire
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // 1. LE VIDEUR : On vérifie si tu es connecté au chargement de la page
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Pas de session ? On te renvoie au login
        window.location.href = "/login"; 
      } else {
        // Connecté ? On sauvegarde ton ID pour l'utiliser dans le formulaire
        setUserId(session.user.id);
      }
    };
    checkUser();
  }, [router]);

  // 2. L'ENVOI : La fonction qui se déclenche quand on valide le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!userId) return;

    try {
      // ÉTAPE A : On crée d'abord le Client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert([{ user_id: userId, name: clientName, email: clientEmail }])
        .select() // .select() est vital pour que Supabase nous renvoie l'ID généré
        .single();

      if (clientError) throw clientError;

      // ÉTAPE B : On crée la facture rattachée à ce nouveau client
      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert([{
          client_id: clientData.id,
          invoice_number: invoiceNumber,
          amount: parseFloat(amount), // On s'assure que c'est bien un nombre
          due_date: dueDate
        }]);

      if (invoiceError) throw invoiceError;

      alert("✅ Facture ajoutée avec succès ! Le Mauvais Flic est prêt à sévir.");
      
      // On vide le formulaire pour la prochaine facture
      setClientName("");
      setClientEmail("");
      setInvoiceNumber("");
      setAmount("");
      setDueDate("");

    } catch (error: any) {
      alert("❌ Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. LA DÉCONNEXION
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Écran d'attente le temps que le videur vérifie ton identité (évite les clignotements)
  if (!userId) {
    return <p className="text-center mt-20 text-gray-500">Vérification de la sécurité...</p>;
  }

  return (
    <main className="max-w-3xl mx-auto p-10 text-gray-800">
      
      {/* En-tête avec bouton Déconnexion */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-red-600">Le Mauvais Flic 👮‍♂️</h1>
          <p className="text-gray-500 mt-1">Ton ID secret : {userId.substring(0, 8)}...</p>
        </div>
        <button 
          onClick={handleLogout}
          className="text-sm border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition"
        >
          Déconnexion
        </button>
      </div>

      {/* Le bloc du formulaire */}
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold mb-6">Ajouter une facture en retard</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom du client</label>
              <input type="text" required className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail du client</label>
              <input type="email" required className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">N° de Facture</label>
              <input type="text" required placeholder="FA-2026-01" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Montant TTC (€)</label>
              <input type="number" step="0.01" required placeholder="1500.00" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Échéance</label>
              <input type="date" required className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full mt-6 text-white font-bold py-3 rounded-lg transition-colors ${loading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {loading ? "Enregistrement..." : "Activer le Mauvais Flic 🚨"}
          </button>

        </form>
      </div>
    </main>
  );
}