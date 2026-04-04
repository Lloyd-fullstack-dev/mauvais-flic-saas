"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  
  const [intervalDays, setIntervalDays] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);

  // États du formulaire
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customInterval, setCustomInterval] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // NOUVEAU : États pour le mode Édition
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const fetchInvoices = async (uid: string) => {
    const { data } = await supabase
      .from("invoices")
      .select("*, clients!inner(name, email, user_id)")
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
    
    if (data && data.reminder_interval_days) setIntervalDays(data.reminder_interval_days);
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
    const { error } = await supabase.from("profiles").update({ reminder_interval_days: intervalDays }).eq("id", userId);
    if (error) alert("Erreur : " + error.message);
    else alert("✅ Rythme global mis à jour !");
    setSavingSettings(false);
  };

  // NOUVEAU : Fonction pour vider le formulaire et annuler l'édition
  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setInvoiceNumber("");
    setAmount("");
    setDueDate("");
    setCustomInterval("");
    setShowAdvanced(false);
    setEditingInvoiceId(null);
    setEditingClientId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!userId) return;

    try {
      const intervalValue = customInterval ? parseInt(customInterval) : null;

      if (editingInvoiceId && editingClientId) {
        // --- MODE MODIFICATION ---
        const { error: clientError } = await supabase
          .from("clients")
          .update({ name: clientName, email: clientEmail })
          .eq("id", editingClientId);
        if (clientError) throw clientError;

        const { error: invoiceError } = await supabase
          .from("invoices")
          .update({ 
            invoice_number: invoiceNumber, 
            amount: parseFloat(amount), 
            due_date: dueDate,
            custom_interval_days: intervalValue
          })
          .eq("id", editingInvoiceId);
        if (invoiceError) throw invoiceError;

        alert("✅ Facture modifiée avec succès !");
      } else {
        // --- MODE CRÉATION ---
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .insert([{ user_id: userId, name: clientName, email: clientEmail }]).select().single();
        if (clientError) throw clientError;

        const { error: invoiceError } = await supabase
          .from("invoices")
          .insert([{ 
            client_id: clientData.id, 
            invoice_number: invoiceNumber, 
            amount: parseFloat(amount), 
            due_date: dueDate,
            custom_interval_days: intervalValue
          }]);
        if (invoiceError) throw invoiceError;

        alert("✅ Facture ajoutée !");
      }

      resetForm();
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

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm("🚨 Es-tu sûr de vouloir supprimer cette facture ?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
    if (error) alert("Erreur : " + error.message);
    else {
      fetchInvoices(userId!);
      if (editingInvoiceId === invoiceId) resetForm(); // Sécurité si on supprime ce qu'on est en train d'éditer
    }
    setOpenMenuId(null);
  };

  // NOUVEAU : La vraie fonction Modifier
  const handleEdit = (invoice: any) => {
    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
    
    setClientName(client?.name || "");
    setClientEmail(client?.email || "");
    setInvoiceNumber(invoice.invoice_number);
    setAmount(invoice.amount.toString());
    setDueDate(invoice.due_date);
    setCustomInterval(invoice.custom_interval_days ? invoice.custom_interval_days.toString() : "");
    setShowAdvanced(!!invoice.custom_interval_days);
    
    setEditingInvoiceId(invoice.id);
    setEditingClientId(invoice.client_id);
    setOpenMenuId(null);

    // Remonte en haut de la page pour voir le formulaire
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const pendingAmount = invoicesList.filter(inv => inv.status !== "paid").reduce((total, inv) => total + inv.amount, 0);
  const recoveredAmount = invoicesList.filter(inv => inv.status === "paid").reduce((total, inv) => total + inv.amount, 0);
  const recoveredCount = invoicesList.filter(inv => inv.status === "paid").length;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans pb-32">
      <main className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              Le Mauvais Flic <span className="text-4xl">🚨</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium">L'automatisation au service de ta trésorerie.</p>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-600 bg-slate-100 px-5 py-2.5 rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-all">
            Déconnexion
          </button>
        </header>

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
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 mb-4">⚙️ Paramètres globaux</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rythme par défaut</label>
                  <p className="text-xs text-slate-500 mb-3">S'applique si aucun rythme n'est défini pour une facture.</p>
                  <div className="flex items-center gap-3">
                    <input type="number" min="1" max="30" className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 w-24 text-center focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" value={intervalDays} onChange={(e) => setIntervalDays(parseInt(e.target.value) || 1)} />
                    <span className="text-sm font-medium text-slate-500">jours</span>
                  </div>
                </div>
                <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 text-sm font-bold shadow-md shadow-slate-900/10 transition-all active:scale-[0.98]">
                  {savingSettings ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className={`bg-white p-8 rounded-2xl shadow-sm border transition-all ${editingInvoiceId ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-100'}`}>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                {editingInvoiceId ? "✏️ Modifier la facture" : "➕ Ajouter une facture en retard"}
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

                <div className="border-t border-slate-100 pt-3 mt-2">
                  <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1.5 transition-colors">
                    ⚙️ {showAdvanced ? "Masquer les options" : "Personnaliser le rythme pour ce client"}
                  </button>
                  {showAdvanced && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in-down">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Rythme spécifique (en jours)</label>
                      <input type="number" min="1" max="30" placeholder={`Par défaut : ${intervalDays} jours`} className="w-full sm:w-1/2 bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={loading} className={`flex-1 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] ${loading ? 'bg-red-400 text-white cursor-not-allowed' : (editingInvoiceId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/30 hover:from-red-700 hover:to-red-600')}`}>
                    {loading ? "Enregistrement en cours..." : (editingInvoiceId ? "Enregistrer les modifications" : "Lâcher le Mauvais Flic 🐕")}
                  </button>
                  
                  {editingInvoiceId && (
                    <button type="button" onClick={resetForm} className="px-6 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-visible">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">📂 Mes factures en cours</h2>
          </div>
          {invoicesList.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-slate-500 font-medium">Aucune facture en retard pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-visible relative">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-5">Client</th>
                    <th className="p-5">N° Facture</th>
                    <th className="p-5">Montant</th>
                    <th className="p-5">Rythme</th>
                    <th className="p-5">Statut</th>
                    <th className="p-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesList.map((invoice) => {
                    const clientName = Array.isArray(invoice.clients) ? invoice.clients[0]?.name : invoice.clients?.name;
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5"><p className="font-bold text-slate-900">{clientName}</p></td>
                        <td className="p-5 text-slate-500 font-medium">{invoice.invoice_number}</td>
                        <td className="p-5 font-bold text-slate-900">{invoice.amount} €</td>
                        <td className="p-5 text-sm font-medium">
                          {invoice.custom_interval_days ? (
                            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">{invoice.custom_interval_days} j</span>
                          ) : (
                            <span className="text-slate-400">Global</span>
                          )}
                        </td>
                        <td className="p-5">
                          {invoice.status === "paid" ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200/50"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Payée</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200/50"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>En attente ({invoice.reminder_level})</span>
                          )}
                        </td>
                        
                        <td className="p-5 text-right relative">
                          <div className="flex items-center justify-end gap-3">
                            {invoice.status !== "paid" && (
                              <button onClick={() => handleMarkAsPaid(invoice.id)} className="text-sm bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 font-semibold shadow-sm transition-all active:scale-[0.96]">
                                Marquer payée
                              </button>
                            )}
                            
                            <div className="relative">
                              <button 
                                onClick={() => setOpenMenuId(openMenuId === invoice.id ? null : invoice.id)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="12" cy="5" r="1"></circle>
                                  <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                              </button>

                              {openMenuId === invoice.id && (
                                <div className="absolute right-0 top-10 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 animate-fade-in-down">
                                  <button onClick={() => handleEdit(invoice)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-medium transition-colors">
                                    ✏️ Modifier
                                  </button>
                                  <div className="h-px bg-slate-100 my-1"></div>
                                  <button onClick={() => handleDelete(invoice.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors">
                                    🗑️ Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}