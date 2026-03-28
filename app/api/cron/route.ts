import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

// On initialise Resend avec ta clé secrète
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    // 1. On cherche toutes les factures "en attente" (pending)
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, clients(name, email)') // On récupère aussi les infos du client lié
      .eq('status', 'pending');

    if (error) throw error;
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ message: "Aucune facture en attente." });
    }

    const today = new Date();
    let emailsSent = 0;

    // 2. On analyse chaque facture une par une
    for (const invoice of invoices) {
      const dueDate = new Date(invoice.due_date);

      // Si la date d'échéance est passée (et qu'on n'a pas encore fait 3 relances)
      if (dueDate < today && invoice.reminder_level < 3) {
        
        const clientEmail = invoice.clients.email;
        const clientName = invoice.clients.name;
        
        // 3. On prépare le texte de l'e-mail selon le niveau de relance
        let emailSubject = "";
        let emailText = "";

        if (invoice.reminder_level === 0) {
          emailSubject = `Rappel amical : Facture ${invoice.invoice_number} arrivée à échéance`;
          emailText = `Bonjour ${clientName},\n\nSauf erreur de notre part, la facture ${invoice.invoice_number} d'un montant de ${invoice.amount}€ est arrivée à échéance le ${invoice.due_date}.\n\nPourriez-vous procéder au règlement rapidement ?\n\nCordialement,\nLe service comptabilité.`;
        } else if (invoice.reminder_level === 1) {
          emailSubject = `URGENT : Facture ${invoice.invoice_number} en retard`;
          emailText = `Bonjour ${clientName},\n\nNous n'avons toujours pas reçu le paiement de la facture ${invoice.invoice_number} (${invoice.amount}€).\nMerci de régulariser la situation sous 48h.\n\nCordialement.`;
        } else {
          emailSubject = `MISE EN DEMEURE : Facture ${invoice.invoice_number}`;
          emailText = `Bonjour,\n\nCeci est une mise en demeure concernant la facture ${invoice.invoice_number}. Sans réception de votre paiement de ${invoice.amount}€, des pénalités de retard légales seront appliquées.\n\nService Recouvrement.`;
        }

        // 4. On envoie l'e-mail avec Resend
        await resend.emails.send({
          from: 'Recouvrement <onboarding@resend.dev>', // Adresse de test par défaut de Resend
          to: clientEmail,
          subject: emailSubject,
          text: emailText,
        });

        // 5. On met à jour la base de données pour dire qu'on a envoyé une relance supplémentaire
        await supabase
          .from('invoices')
          .update({ reminder_level: invoice.reminder_level + 1 })
          .eq('id', invoice.id);

        emailsSent++;
      }
    }

    return NextResponse.json({ message: `${emailsSent} e-mail(s) de relance envoyé(s) !` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}