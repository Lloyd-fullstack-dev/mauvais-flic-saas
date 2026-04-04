import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; 
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function replaceVariables(text: string, invoice: any, clientName: string) {
  if (!text) return "";
  return text
    .replace(/\[clientName\]/g, clientName)
    .replace(/\[invoiceNumber\]/g, invoice.invoice_number)
    .replace(/\[amount\]/g, invoice.amount.toString())
    .replace(/\[dueDate\]/g, invoice.due_date);
}

export async function GET(request: Request) { 
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  try {
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('*, clients(name, email, user_id)')
      .eq('status', 'pending');

    if (error) throw error;
    if (!invoices || invoices.length === 0) return NextResponse.json({ message: "Aucune facture en attente." });

    const today = new Date();
    let emailsSent = 0;

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.due_date);

      if (dueDate < today && invoice.reminder_level < 3) {
        
        const clientId = Array.isArray(invoice.clients) ? invoice.clients[0]?.user_id : invoice.clients?.user_id;
        const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', clientId).single();
        
        const customInterval = invoice.custom_interval_days || profile?.reminder_interval_days || 7; 
        let shouldSendEmail = false;

        if (invoice.reminder_level === 0) {
          shouldSendEmail = true;
        } else if (invoice.last_reminder_date) {
          const lastReminder = new Date(invoice.last_reminder_date);
          const diffTime = Math.abs(today.getTime() - lastReminder.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= customInterval) shouldSendEmail = true;
        }

        if (shouldSendEmail) {
          const clientEmail = Array.isArray(invoice.clients) ? invoice.clients[0]?.email : invoice.clients?.email;
          const clientName = Array.isArray(invoice.clients) ? invoice.clients[0]?.name : invoice.clients?.name;
          
          let emailSubject = "";
          let emailText = "";

          if (invoice.reminder_level === 0) {
            emailSubject = replaceVariables(profile?.rem_1_subject || "Rappel : Facture [invoiceNumber]", invoice, clientName);
            emailText = replaceVariables(profile?.rem_1_text || "Bonjour [clientName], facture [invoiceNumber] en attente.", invoice, clientName);
          } else if (invoice.reminder_level === 1) {
            emailSubject = replaceVariables(profile?.rem_2_subject || "URGENT : Facture [invoiceNumber]", invoice, clientName);
            emailText = replaceVariables(profile?.rem_2_text || "Bonjour [clientName], merci de régler la facture [invoiceNumber].", invoice, clientName);
          } else {
            emailSubject = replaceVariables(profile?.rem_3_subject || "MISE EN DEMEURE : [invoiceNumber]", invoice, clientName);
            emailText = replaceVariables(profile?.rem_3_text || "Mise en demeure pour la facture [invoiceNumber].", invoice, clientName);
          }

          // 1. TENTATIVE D'ENVOI RESEND
          const { error: resendError } = await resend.emails.send({
            from: 'Recouvrement <onboarding@resend.dev>',
            to: clientEmail,
            subject: emailSubject,
            text: emailText,
          });

          if (resendError) {
            console.error(`❌ Erreur Resend pour ${clientEmail}:`, resendError);
          }

          // 2. TENTATIVE DE MISE À JOUR SUPABASE
          const { error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({ 
              reminder_level: invoice.reminder_level + 1,
              last_reminder_date: new Date().toISOString()
            })
            .eq('id', invoice.id);

          if (updateError) {
            console.error(`❌ Erreur Supabase pour facture ${invoice.id}:`, updateError);
          } else {
            // On incrémente le compteur SEULEMENT si la mise à jour BDD a marché !
            emailsSent++;
          }
        }
      }
    }

    return NextResponse.json({ message: `${emailsSent} e-mail(s) de relance envoyé(s) !` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}