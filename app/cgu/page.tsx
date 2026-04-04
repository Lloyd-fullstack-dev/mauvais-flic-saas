export default function CGUPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans">
      <main className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Conditions Générales d'Utilisation</h1>
        
        <div className="space-y-6 text-slate-600">
          <p><em>Note : Ce texte est provisoire.</em></p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Objet du service</h2>
            <p>Le Mauvais Flic est un outil d'automatisation d'envoi d'e-mails pour le recouvrement de factures impayées.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Responsabilité</h2>
            <p>L'utilisateur est seul responsable des informations (montants, adresses e-mails) saisies dans l'outil. Le Mauvais Flic ne garantit en aucun cas le paiement effectif des factures par les clients relancés.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Utilisation abusive</h2>
            <p>Il est interdit d'utiliser ce service pour envoyer du spam ou harceler des personnes n'ayant aucune dette légitime envers l'utilisateur.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100">
          <a href="/" className="text-red-600 font-bold hover:underline">← Retour au tableau de bord</a>
        </div>
      </main>
    </div>
  );
}