export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans">
      <main className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Politique de Confidentialité (RGPD)</h1>
        
        <div className="space-y-6 text-slate-600">
          <p><em>Note : Ce texte est provisoire et devra être remplacé par une politique RGPD complète avant le lancement commercial.</em></p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">1. Collecte des données</h2>
            <p>Le Mauvais Flic collecte les adresses e-mails de vos clients uniquement dans le but d'exécuter le service de relance automatique.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">2. Sécurité</h2>
            <p>Vos données sont chiffrées et stockées de manière sécurisée via notre partenaire Supabase. Les mots de passe sont hachés.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-2">3. Vos droits</h2>
            <p>Conformément à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de modification et de suppression de vos données.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100">
          <a href="/" className="text-red-600 font-bold hover:underline">← Retour au tableau de bord</a>
        </div>
      </main>
    </div>
  );
}