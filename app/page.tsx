"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  
  const [intervalDays, setIntervalDays] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const fetchInvoices = async (uid: string) => {
    const { data } = await supabase
      .from("invoices")
      .select("*, clients!inner(name, user_id)")
      .eq("clients.user_id", uid)
      .order("created_at", { ascending: false });

    if (data) setInvoicesList(data);
  };

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("reminder_interval_days")
      .eq("id", uid)
      .single();
    
    if (data && data.reminder_interval_days) {
      setIntervalDays(data.reminder_interval_days);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login"; 
      } else {
        setUserId(session.user.id);
        fetchInvoices(session.user.id);
        fetchProfile(session.user.id);
      }
    };
    checkUser();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("profiles")
      .update({ reminder_interval_days: intervalDays })
      .eq("id", userId);
    
    if (error) alert("Erreur : " + error.message);
    else alert("✅ Rythme de relance mis à jour !");
    
    setSavingSettings(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!userId) return;

    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert([{ user_id: userId, name: clientName, email: clientEmail }]).select().single();
      if (clientError) throw clientError;

      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert([{ client_id: clientData.id, invoice_number: invoiceNumber, amount: parseFloat(amount), due_date: dueDate }]);
      if (invoiceError) throw invoiceError;

      alert("✅ Facture ajoutée !");
      setClientName(""); setClientEmail(""); setInvoiceNumber(""); setAmount(""); setDueDate("");
      fetchInvoices(userId);
    } catch (error: any) {
      alert("❌ Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!window.confirm("Confirmer le paiement ?")) return;
    await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
    fetchInvoices(userId!);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!userId) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-red-200 rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium">Vérification de la sécurité...</p>
      </div>
    </div>
  );

  // --- CALCUL DES STATISTIQUES EN DIRECT ---
  const pendingAmount = invoicesList
    .filter(inv => inv.status !== "paid")
    .reduce((total, inv) => total + inv.amount, 0);

  const recoveredAmount = invoicesList
    .filter(inv => inv.status === "paid")
    .reduce((total, inv) => total + inv.amount, 0);

  const recoveredCount = invoicesList.filter(inv => inv.status === "paid").length;
  // -----------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans">
      <main className="max-w-5xl mx-auto space-y-8">
        
        {/* En-tête (Header) */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              Le Mauvais Flic <span className="text-4xl">🚨</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium">L'automatisation au service de ta trésorerie.</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-sm font-medium text-slate-600 bg-slate-100 px-5 py-2.5 rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-all"
          >
            Déconnexion
          </button>
        </header>

        {/* NOUVEAU : Les 3 blocs de statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Argent bloqué</p>
            <p className="text-3xl font-black text-slate-900">{pendingAmount.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Trésorerie sauvée</p>
            <p className="text-3xl font-black text-slate-900">{recoveredAmount.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Factures récupérées</p>
            <p className="text-3xl font-black text-slate-900">{recoveredCount} <span className="text-lg text-slate-400 font-medium tracking-normal">dossiers</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : Paramètres */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 mb-4">
                ⚙️ Paramètres globaux
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rythme par défaut</label>
                  <p className="text-xs text-slate-500 mb-3">Délai d'attente du robot entre deux e-mails (sera modifiable par facture plus tard).</p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      min="1" 
                      max="30" 
                      className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 w-24 text-center focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                      value={intervalDays} 
                      onChange={(e) => setIntervalDays(parseInt(e.target.value) || 1)} 
                    />
                    <span className="text-sm font-medium text-slate-500">jours</span>
                  </div>
                </div>
                <button 
                  onClick={handleSaveSettings} 
                  disabled={savingSettings}
                  className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 text-sm font-bold shadow-md shadow-slate-900/10 transition-all active:scale-[0.98]"
                >
                  {savingSettings ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : Formulaire */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                ➕ Ajouter une facture en retard
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom du client</label>
                    <input type="text" required placeholder="Ex: Studio Dupont" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail du client</label>
                    <input type="email" required placeholder="contact@dupont.fr" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">N° Facture</label>
                    <input type="text" required placeholder="FA-2026-01" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Montant (€)</label>
                    <input type="number" step="0.01" required placeholder="1500.00" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Date d'échéance</label>
                    <input type="date" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-500" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className={`w-full mt-2 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] ${loading ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/30 hover:from-red-700 hover:to-red-600'}`}>
                  {loading ? "Enregistrement en cours..." : "Lâcher le Mauvais Flic 🐕"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* SECTION BASSE : La liste des factures */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              📂 Mes factures en cours
            </h2>
          </div>
          
          {invoicesList.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-slate-500 font-medium">Aucune facture en retard pour le moment.</p>
              <p className="text-slate-400 text-sm mt-1">Vos clients sont exemplaires !</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-5">Client</th>
                    <th className="p-5">N° Facture</th>
                    <th className="p-5">Montant</th>
                    <th className="p-5">Statut</th>
                    <th className="p-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesList.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-5">
                        <p className="font-bold text-slate-900">{invoice.clients?.name}</p>
                      </td>
                      <td className="p-5 text-slate-500 font-medium">{invoice.invoice_number}</td>
                      <td className="p-5 font-bold text-slate-900">{invoice.amount} €</td>
                      <td className="p-5">
                        {invoice.status === "paid" ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Payée
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            En attente (Relances : {invoice.reminder_level})
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        {invoice.status !== "paid" && (
                          <button 
                            onClick={() => handleMarkAsPaid(invoice.id)} 
                            className="text-sm bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 font-semibold shadow-sm transition-all active:scale-[0.96] opacity-0 group-hover:opacity-100 sm:opacity-100"
                          >
                            Marquer payée
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}