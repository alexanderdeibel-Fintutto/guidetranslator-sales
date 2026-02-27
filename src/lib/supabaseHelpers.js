import { supabase } from "../supabaseClient";

export async function upsertLead(leadData) {
  const { data, error } = await supabase
    .from('gt_leads')
    .upsert({
      email: leadData.email,
      name: leadData.name,
      company: leadData.company,
      role: leadData.role || null,
      fleet_size: leadData.ships || null,
      phone: leadData.phone || null,
      segment: leadData.segment || 'kreuzfahrt',
      source: 'sales_calculator',
      status: 'new',
      pipeline_stage: 'neu',
      last_activity: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select()
    .single();
  return { data, error };
}

export async function loadLeadByEmail(email) {
  const { data } = await supabase
    .from('gt_leads')
    .select('*')
    .eq('email', email)
    .single();
  return data;
}

export async function saveCalculation(leadId, calcData) {
  const { data, error } = await supabase
    .from('gt_calculations')
    .insert({
      lead_id: leadId,
      name: calcData.name,
      inputs: calcData.inputs,
      results: {
        totalExcursions: calcData.totalExcursions,
        totalTraditionalCost: calcData.totalTraditionalCost,
        totalFintuttoCost: calcData.totalFintuttoCost,
        annualLicense: calcData.annualLicense,
        totalApiCostEur: calcData.totalApiCostEur,
        savings: calcData.savings,
        savingsPct: calcData.savingsPct,
        costPerPaxPerExcursion: calcData.costPerPaxPerExcursion,
        tierName: calcData.tierName,
      },
    })
    .select()
    .single();
  return { data, error };
}

export async function loadCalculations(leadId) {
  const { data } = await supabase
    .from('gt_calculations')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function deleteCalculation(calcId) {
  await supabase.from('gt_calculations').delete().eq('id', calcId);
}

export async function submitContactRequest(leadId, requestData) {
  const { data, error } = await supabase
    .from('gt_contact_requests')
    .insert({
      lead_id: leadId,
      interest_level: requestData.interest,
      timeline: requestData.timeline,
      message: requestData.message,
    })
    .select()
    .single();

  // Update lead status
  await supabase
    .from('gt_leads')
    .update({ status: 'request_sent', pipeline_stage: 'angebot', offer_created_at: new Date().toISOString(), last_activity: new Date().toISOString() })
    .eq('id', leadId);

  return { data, error };
}

// ─── LOCAL STORAGE FALLBACK ──────────────────────────────────
const LS_KEY = "gt-sales-data";
export function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; } }
export function lsSave(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} }
export function lsClear() { localStorage.removeItem(LS_KEY); }
