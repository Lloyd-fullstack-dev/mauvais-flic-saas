"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  
  const [intervalDays, setIntervalDays] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  const [rem1Subject, setRem1Subject] = useState("");
  const [rem1Text, setRem1Text] = useState("");
  const [rem2Subject, setRem2Subject] = useState("");
  const [rem2Text, setRem2Text] = useState("");
  const [rem3Subject, setRem3Subject] = useState("");
  const [rem3Text, setRem3Text] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customInterval, setCustomInterval] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "paused">("all");

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchInvoices = async (uid: string) => {
    const { data } = await supabase
      .from("invoices")
      .select("*, clients!inner(name, email, user_id)")
      .eq("clients.user_id", uid)
      .order("created_at", { ascending: false });

    if (data) setInvoicesList(data);
  };

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    if (data) {
      if (data.reminder_interval_days) setIntervalDays(data.reminder_interval_days);
      setRem1Subject(data.rem_1_subject || ""); setRem1Text(data.rem_1_text || "");
      setRem2Subject(data.rem_2_subject || ""); setRem2Text(data.rem_2_text || "");
      setRem3Subject(data.rem_3_subject || ""); setRem3Text(data.rem_3_text || "");
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = "/login"; 
      else { setUserId(session.user.id); fetchInvoices(session.user.id); fetchProfile(session.user.id); }
    };
    checkUser();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase.from("profiles").update({ 
      reminder_interval_days: intervalDays,
      rem_1_subject: rem1Subject, rem_1_text: rem1Text,
      rem_2_subject: rem2Subject, rem_2_text: rem2Text,
      rem_3_subject: rem3Subject, rem_3_text: rem3Text,
    }).eq("id", userId);
    
    if (error) toast.error("Erreur : " + error.message);
    else {
      toast.success("Paramètres mis à jour !");
      setIsEmailModalOpen(false); 
    }
    setSavingSettings(false);
  };

  // NOUVEAU : Fonction pour remettre les textes par défaut
  const handleResetDefaults = () => {
    if (!window.confirm("Voulez-vous écraser vos textes actuels avec les messages par défaut ?")) return;
    
    setRem1Subject("Rappel amical : Facture [invoiceNumber] arrivée à échéance");
    setRem1Text("Bonjour [clientName],\n\nSauf erreur de notre part, la facture [invoiceNumber] d'un montant de [amount]€ est arrivée à échéance le [dueDate].\n\nPourriez-vous procéder au règlement rapidement ?\n\nCordialement,\nLe service comptabilité.");
    
    setRem2Subject("URGENT : Facture [invoiceNumber] en retard");
    setRem2Text("Bonjour [clientName],\n\nNous n'avons toujours pas reçu le paiement de la facture [invoiceNumber] ([amount]€).\nMerci de régulariser la situation sous 48h.\n\nCordialement.");
    
    setRem3Subject("MISE EN DEMEURE : Facture [invoiceNumber]");
    setRem3Text("Bonjour [clientName],\n\nCeci est une mise en demeure concernant la facture [invoiceNumber]. Sans réception de votre paiement de [amount]€, des pénalités de retard légales seront appliquées.\n\nService Recouvrement.");
    
    toast.success("Textes par défaut appliqués. N'oubliez pas de sauvegarder !");
  };

  const resetForm = () => {
    setClientName(""); setClientEmail(""); setInvoiceNumber(""); setAmount(""); setDueDate(""); setCustomInterval(""); setShowAdvanced(false); setEditingInvoiceId(null); setEditingClientId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!userId) return;

    try {
      const intervalValue = customInterval ? parseInt(customInterval) : null;

      if (editingInvoiceId && editingClientId) {
        const { error: clientError } = await supabase.from("clients").update({ name: clientName, email: clientEmail }).eq("id", editingClientId);
        if (clientError) throw clientError;

        const { error: invoiceError } = await supabase.from("invoices").update({ invoice_number: invoiceNumber, amount: parseFloat(amount), due_date: dueDate, custom_interval_days: intervalValue }).eq("id", editingInvoiceId);
        if (invoiceError) throw invoiceError;

        toast.success("Facture modifiée avec succès !"); 
      } else {
        const { data: clientData, error: clientError } = await supabase.from("clients").insert([{ user_id: userId, name: clientName, email: clientEmail }]).select().single();
        if (clientError) throw clientError;

        const { error: invoiceError } = await supabase.from("invoices").insert([{ client_id: clientData.id, invoice_number: invoiceNumber, amount: parseFloat(amount), due_date: dueDate, custom_interval_days: intervalValue }]);
        if (invoiceError) throw invoiceError;

        toast.success("Facture ajoutée avec succès !"); 
      }

      resetForm();
      fetchInvoices(userId);
    } catch (error: any) { toast.error("Erreur : " + error.message); } finally { setLoading(false); }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!window.confirm("Confirmer le paiement ?")) return;
    await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
    toast.success("Super ! Une facture de plus encaissée 💰"); 
    fetchInvoices(userId!);
  };

  const handleMarkAsPending = async (invoiceId: string) => {
    if (!window.confirm("Remettre cette facture en attente ?")) return;
    await supabase.from("invoices").update({ status: "pending" }).eq("id", invoiceId);
    toast.success("Facture remise en attente 🔄"); 
    fetchInvoices(userId!);
  };

  const handleTogglePause = async (invoiceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "paused" ? "pending" : "paused";
    const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", invoiceId);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(newStatus === "paused" ? "Facture en pause ⏸️" : "Relances réactivées ▶️"); fetchInvoices(userId!); }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm("🚨 Es-tu sûr de vouloir supprimer cette facture ?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
    if (error) toast.error("Erreur : " + error.message); 
    else { toast.success("Facture supprimée."); fetchInvoices(userId!); if (editingInvoiceId === invoiceId) resetForm(); }
  };

  const handleEdit = (invoice: any) => {
    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
    setClientName(client?.name || ""); setClientEmail(client?.email || ""); setInvoiceNumber(invoice.invoice_number); setAmount(invoice.amount.toString()); setDueDate(invoice.due_date);
    setCustomInterval(invoice.custom_interval_days ? invoice.custom_interval_days.toString() : ""); setShowAdvanced(!!invoice.custom_interval_days);
    setEditingInvoiceId(invoice.id); setEditingClientId(invoice.client_id); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!userId) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500 font-medium">Vérification de la sécurité...</p></div>
  );

  const pendingAmount = invoicesList.filter(inv => inv.status !== "paid").reduce((total, inv) => total + inv.amount, 0);
  const recoveredAmount = invoicesList.filter(inv => inv.status === "paid").reduce((total, inv) => total + inv.amount, 0);
  const recoveredCount = invoicesList.filter(inv => inv.status === "paid").length;

  const filteredInvoices = invoicesList.filter(invoice => {
    if (filterStatus !== "all" && invoice.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const clientName = (Array.isArray(invoice.clients) ? invoice.clients[0]?.name : invoice.clients?.name)?.toLowerCase() || "";
      const invoiceNum = invoice.invoice_number.toLowerCase();
      if (!clientName.includes(query) && !invoiceNum.includes(query)) return false;
    }
    return true;
  });

  return (
    // On utilise flex et flex-col pour que le footer reste toujours bien en bas même si la page est courte
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <Toaster position="bottom-right" />

      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">✉️ Modèles de relance</h2>
              {/* MODIF : La croix est beaucoup plus grande et facile à cliquer */}
              <button 
                onClick={() => setIsEmailModalOpen(false)} 
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-800 rounded-full transition-colors text-3xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 bg-white flex-1">
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm border border-blue-100">
                <strong>Variables magiques :</strong> Le robot remplacera automatiquement ces mots dans tes e-mails :<br/>
                <code className="font-bold bg-white px-1 py-0.5 rounded text-blue-600 mt-2 inline-block">[clientName]</code> 
                <code className="font-bold bg-white px-1 py-0.5 rounded text-blue-600 mt-2 inline-block ml-2">[invoiceNumber]</code> 
                <code className="font-bold bg-white px-1 py-0.5 rounded text-blue-600 mt-2 inline-block ml-2">[amount]</code> 
                <code className="font-bold bg-white px-1 py-0.5 rounded text-blue-600 mt-2 inline-block ml-2">[dueDate]</code>
              </div>

              <div className="space-y-4 border border-slate-100 p-5 rounded-xl bg-slate-50/50">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">👋 Relance 1 <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-medium">Amicale</span></h4>
                <input type="text" placeholder="Sujet : Rappel de facture [invoiceNumber]" className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500 bg-white" value={rem1Subject} onChange={e => setRem1Subject(e.target.value)} />
                <textarea rows={3} placeholder="Bonjour [clientName], sauf erreur de notre part..." className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white" value={rem1Text} onChange={e => setRem1Text(e.target.value)} />
              </div>

              <div className="space-y-4 border border-amber-100 p-5 rounded-xl bg-amber-50/30">
                <h4 className="font-bold text-amber-800 flex items-center gap-2">⚠️ Relance 2 <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Ferme</span></h4>
                <input type="text" placeholder="Sujet : URGENT - Facture [invoiceNumber]" className="w-full text-sm border border-amber-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-amber-500 bg-white" value={rem2Subject} onChange={e => setRem2Subject(e.target.value)} />
                <textarea rows={3} placeholder="Bonjour [clientName], nous sommes toujours en attente..." className="w-full text-sm border border-amber-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white" value={rem2Text} onChange={e => setRem2Text(e.target.value)} />
              </div>

              <div className="space-y-4 border border-red-100 p-5 rounded-xl bg-red-50/30">
                <h4 className="font-bold text-red-800 flex items-center gap-2">🚨 Relance 3 <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Mise en demeure</span></h4>
                <input type="text" placeholder="Sujet : MISE EN DEMEURE - [invoiceNumber]" className="w-full text-sm border border-red-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500 bg-white" value={rem3Subject} onChange={e => setRem3Subject(e.target.value)} />
                <textarea rows={4} placeholder="Ceci est une mise en demeure..." className="w-full text-sm border border-red-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white" value={rem3Text} onChange={e => setRem3Text(e.target.value)} />
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-b-2xl">
              {/* MODIF : Bouton pour remettre les messages par défaut */}
              <button 
                onClick={handleResetDefaults} 
                className="w-full sm:w-auto px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-800 transition-colors"
              >
                🔄 Remettre par défaut
              </button>
              
              <div className="flex w-full sm:w-auto gap-3">
                <button onClick={() => setIsEmailModalOpen(false)} className="flex-1 sm:flex-none px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Annuler</button>
                <button onClick={handleSaveSettings} disabled={savingSettings} className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors">
                  {savingSettings ? "En cours..." : "Sauvegarder"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODIF : Le main prend flex-grow (flex-1) pour pousser le footer tout en bas de la page */}
      <main className="flex-1 max-w-5xl mx-auto w-full space-y-8 py-12 px-4 sm:px-6 lg:px-8">
        
        <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">Le Mauvais Flic 🚨</h1>
            <p className="text-slate-500 mt-1 font-medium">L'automatisation au service de ta trésorerie.</p>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-600 bg-slate-100 px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-all">Déconnexion</button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-red-500"><p className="text-sm font-semibold text-slate-500 uppercase">Argent bloqué</p><p className="text-3xl font-black">{pendingAmount.toLocaleString('fr-FR')} €</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500"><p className="text-sm font-semibold text-slate-500 uppercase">Trésorerie sauvée</p><p className="text-3xl font-black">{recoveredAmount.toLocaleString('fr-FR')} €</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-l-blue-500"><p className="text-sm font-semibold text-slate-500 uppercase">Factures récupérées</p><p className="text-3xl font-black">{recoveredCount} <span className="text-lg text-slate-400 font-medium">dossiers</span></p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-4">⚙️ Paramètres globaux</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rythme par défaut</label>
                  <div className="flex items-center gap-3">
                    <input type="number" min="1" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-24 text-center focus:ring-2 focus:ring-red-500 outline-none" value={intervalDays} onChange={(e) => setIntervalDays(parseInt(e.target.value) || 1)} />
                    <span className="text-sm text-slate-500">jours</span>
                  </div>
                </div>

                <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 text-sm font-bold transition-all">
                  {savingSettings ? "Enregistrement..." : "Enregistrer"}
                </button>

                <div className="pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setIsEmailModalOpen(true)} 
                    className="w-full flex justify-center items-center gap-2 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 px-4 py-2.5 rounded-xl hover:border-red-400 hover:text-red-600 transition-colors"
                  >
                    ✉️ Personnaliser les e-mails
                  </button>
                </div>
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
                    <label className="block text-sm font-medium mb-1.5">Nom du client</label>
                    <input type="text" required placeholder="Ex: Studio Dupont" className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">E-mail du client</label>
                    <input type="email" required placeholder="contact@dupont.fr" className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">N° Facture</label>
                    <input type="text" required placeholder="FA-2026-01" className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Montant (€)</label>
                    <input type="number" step="0.01" required placeholder="1500.00" className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Échéance</label>
                    <input type="date" required className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 text-slate-500" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-2">
                  <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">⚙️ Personnaliser le rythme pour ce client</button>
                  {showAdvanced && (
                    <div className="mt-4 p-4 bg-slate-50 border rounded-xl">
                      <label className="block text-sm font-medium mb-1.5">Rythme spécifique (en jours)</label>
                      <input type="number" min="1" placeholder={`Défaut: ${intervalDays} j`} className="w-full sm:w-1/2 bg-white border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-red-500" value={customInterval} onChange={(e) => setCustomInterval(e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button type="submit" disabled={loading} className={`flex-1 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all ${loading ? 'bg-red-400 text-white' : (editingInvoiceId ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-red-600 text-white hover:bg-red-700')}`}>
                    {loading ? "En cours..." : (editingInvoiceId ? "Enregistrer" : "Lâcher le Mauvais Flic 🐕")}
                  </button>
                  {editingInvoiceId && <button type="button" onClick={resetForm} className="px-6 py-3.5 bg-slate-100 font-bold rounded-xl hover:bg-slate-200">Annuler</button>}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-visible">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">📂 Mes factures</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <input type="text" placeholder="🔍 Chercher..." className="w-full sm:w-64 px-4 py-2 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setFilterStatus("all")} className={`px-4 py-1.5 text-sm font-medium rounded-md ${filterStatus === "all" ? "bg-white shadow-sm" : "text-slate-500"}`}>Toutes</button>
                <button onClick={() => setFilterStatus("pending")} className={`px-4 py-1.5 text-sm font-medium rounded-md ${filterStatus === "pending" ? "bg-white shadow-sm" : "text-slate-500"}`}>En attente</button>
                <button onClick={() => setFilterStatus("paused")} className={`px-4 py-1.5 text-sm font-medium rounded-md ${filterStatus === "paused" ? "bg-white shadow-sm" : "text-slate-500"}`}>En pause</button>
                <button onClick={() => setFilterStatus("paid")} className={`px-4 py-1.5 text-sm font-medium rounded-md ${filterStatus === "paid" ? "bg-white shadow-sm" : "text-slate-500"}`}>Payées</button>
              </div>
            </div>
          </div>

          <div className="overflow-visible relative">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-5">Client</th><th className="p-5">N° Facture</th><th className="p-5">Montant</th><th className="p-5">Rythme</th><th className="p-5">Statut</th><th className="p-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((invoice) => {
                  const clientName = Array.isArray(invoice.clients) ? invoice.clients[0]?.name : invoice.clients?.name;
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5"><p className="font-bold">{clientName}</p></td>
                      <td className="p-5 text-slate-500">{invoice.invoice_number}</td>
                      <td className="p-5 font-bold">{invoice.amount} €</td>
                      <td className="p-5 text-sm">{invoice.custom_interval_days ? <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{invoice.custom_interval_days} j</span> : <span className="text-slate-400">Global</span>}</td>
                      <td className="p-5">
                        {invoice.status === "paid" ? <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold">Payée</span>
                        : invoice.status === "paused" ? <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">En pause ⏸️</span>
                        : <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold">En attente ({invoice.reminder_level})</span>}
                      </td>
                      <td className="p-5 text-right relative">
                        <div className="flex items-center justify-end gap-3">
                          {invoice.status !== "paid" && <button onClick={() => handleMarkAsPaid(invoice.id)} className="text-sm bg-white border px-3 py-1.5 rounded-lg hover:border-emerald-500 hover:text-emerald-600 font-semibold shadow-sm transition-all">Marquer payée</button>}
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation(); // <-- AJOUTE JUSTE CETTE LIGNE ICI
                                setOpenMenuId(openMenuId === invoice.id ? null : invoice.id);
                              }}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                            >⋮</button>
                            
                            {openMenuId === invoice.id && (
                              <div className="absolute right-0 top-10 mt-1 w-56 bg-white border rounded-xl shadow-xl z-50 py-2">
                                <button onClick={() => handleEdit(invoice)} className="w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors">✏️ Modifier</button>
                                {invoice.status === "pending" && <button onClick={() => handleTogglePause(invoice.id, invoice.status)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 transition-colors">⏸️ Mettre en pause</button>}
                                {invoice.status === "paused" && <button onClick={() => handleTogglePause(invoice.id, invoice.status)} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">▶️ Reprendre</button>}
                                {invoice.status === "paid" && <button onClick={() => handleMarkAsPending(invoice.id)} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors">🔄 Remettre en attente</button>}
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button onClick={() => handleDelete(invoice.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">🗑️ Supprimer</button>
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
        </div>

      </main>

      {/* Le Footer est maintenant en dehors de <main> mais toujours dans le conteneur principal pour rester collé en bas */}
      <footer className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500 mt-auto">
        <p>© {new Date().getFullYear()} Le Mauvais Flic. Tous droits réservés.</p>
        <div className="flex gap-6">
          <a href="/legal" className="hover:text-slate-900 transition-colors">Mentions légales</a>
          <a href="/confidentialite" className="hover:text-slate-900 transition-colors">Confidentialité (RGPD)</a>
          <a href="/cgu" className="hover:text-slate-900 transition-colors">CGU / CGV</a>
        </div>
      </footer>

    </div>
  );
}