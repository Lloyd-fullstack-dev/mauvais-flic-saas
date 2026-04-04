"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // NOUVEAU : La boîte pour stocker la liste des factures
  const [invoicesList, setInvoicesList] = useState<any[]>([]);

  // Les boîtes pour le formulaire
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // NOUVEAU : Fonction pour aller chercher les factures dans Supabase
  const fetchInvoices = async (uid: string) => {
    const { data, error } = await supabase
      .from("invoices")
      // On demande toutes les factures, et on joint le nom du client
      .select("*, clients!inner(name, user_id)")
      .eq("clients.user_id", uid) // On ne prend que TES clients
      .order("created_at", { ascending: false }); // Les plus récentes en premier

    if (data) {
      setInvoicesList(data);
    } else if (error) {
      console.error("Erreur lors de la récupération :", error);
    }
  };

  // 1. LE VIDEUR (mis à jour pour charger les factures)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = "/login"; 
      } else {
        setUserId(session.user.id);
        // On charge la liste des factures dès qu'on te reconnaît !
        fetchInvoices(session.user.id);
      }
    };
    checkUser();
  }, []);

  // 2. L'ENVOI DU FORMULAIRE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!userId) return;

    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert([{ user_id: userId, name: clientName, email: clientEmail }])
        .select()
        .single();

      if (clientError) throw clientError;

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert([{
          client_id: clientData.id,
          invoice_number: invoiceNumber,
          amount: parseFloat(amount),
          due_date: dueDate
        }]);

      if (invoiceError) throw invoiceError;

      alert("✅ Facture ajoutée avec succès !");
      
      // On vide le formulaire
      setClientName("");
      setClientEmail("");
      setInvoiceNumber("");
      setAmount("");
      setDueDate("");

      // NOUVEAU : On rafraîchit la liste des factures instantanément !
      fetchInvoices(userId);

    } catch (error: any) {
      alert("❌ Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // NOUVEAU : Fonction pour marquer une facture comme payée
  const handleMarkAsPaid = async (invoiceId: string) => {
    // Demande confirmation pour éviter les erreurs de clic
    if (!window.confirm("Confirmer le paiement ? Le robot arrêtera les relances.")) return;

    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", invoiceId);

    if (error) {
      alert("Erreur lors de la mise à jour : " + error.message);
    } else {
      // On rafraîchit la liste pour voir le changement en direct
      fetchInvoices(userId!);
    }
  };

  // 3. LA DÉCONNEXION
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!userId) {
    return <p className="text-center mt-20 text-gray-500">Vérification de la sécurité...</p>;
  }

  return (
    <main className="max-w-4xl mx-auto p-8 text-gray-800">
      
      {/* En-tête */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-red-600">Le Mauvais Flic 👮‍♂️</h1>
          <p className="text-gray-500 mt-1">Tableau de bord</p>
        </div>
        <button onClick={handleLogout} className="text-sm border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 transition">
          Déconnexion
        </button>
      </div>

      {/* Le bloc du formulaire */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-10">
        <h2 className="text-xl font-bold mb-4">Ajouter une facture en retard</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom du client</label>
              <input type="text" required className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail du client</label>
              <input type="email" required className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">N° Facture</label>
              <input type="text" required className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Montant (€)</label>
              <input type="number" step="0.01" required className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Échéance</label>
              <input type="date" required className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-red-500" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={loading} className={`w-full mt-4 text-white font-bold py-3 rounded-lg transition-colors ${loading ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading ? "Enregistrement..." : "Activer le Mauvais Flic 🚨"}
          </button>
        </form>
      </div>

      {/* NOUVEAU : La liste des factures */}
      <h2 className="text-2xl font-bold mb-4">Mes factures en cours</h2>
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {invoicesList.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Aucune facture pour le moment. Tout le monde a payé ! 🎉</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">N° Facture</th>
                <th className="p-4 font-medium">Montant</th>
                <th className="p-4 font-medium">Statut</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoicesList.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-semibold">{invoice.clients?.name}</td>
                  <td className="p-4 text-gray-600">{invoice.invoice_number}</td>
                  <td className="p-4 font-medium">{invoice.amount} €</td>
                  <td className="p-4">
                    {/* Badge de statut */}
                    {invoice.status === "paid" ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Payée ✅</span>
                    ) : (
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center inline-flex">
                        En attente (Relances : {invoice.reminder_level})
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {/* Le bouton d'action n'apparaît que si la facture n'est pas encore payée */}
                    {invoice.status !== "paid" && (
                      <button 
                        onClick={() => handleMarkAsPaid(invoice.id)}
                        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition"
                      >
                        J'ai été payé !
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </main>
  );
}