import { prisma } from '../src/config/db.js';

async function verifyFlow() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- 1. RM LOGIN ---');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rm.rajesh@bank.com', password: 'Password123!' }),
  });
  const { data: { token } } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('✅ RM logged in successfully');

  console.log('\n--- 2. GENERATE NBA VIA AI PIPELINE ---');
  const genRes = await fetch(`${baseUrl}/api/clients/c-101/nbas/generate`, {
    method: 'POST',
    headers,
  });
  const genData = await genRes.json();
  const newNba = genData.data.recommendations[0];
  console.log('✅ Generated NBA ID:', newNba.id, '| Title:', newNba.title);

  console.log('\n--- 3. SAVE OUTREACH DRAFT ---');
  const saveOutreachRes = await fetch(`${baseUrl}/api/nbas/${newNba.id}/outreach`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      draft_text: 'Dear Vikram, Here is your tailored investment opportunity.',
      channel: 'EMAIL',
      tone: 'ADVISORY',
      subject: 'Custom Advisory Opportunity',
    }),
  });
  const outreachData = await saveOutreachRes.json();
  console.log('✅ Saved Outreach ID:', outreachData.data.id, '| Status:', outreachData.data.status);

  console.log('\n--- 4. LOG CONTACT ACTIVITY (DIRECT OUTREACH ID) ---');
  const actRes = await fetch(`${baseUrl}/api/outreach/${outreachData.data.id}/activities`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contact_method: 'CALL',
      contact_status: 'CONTACTED',
      notes: 'Consultation completed. Client expressed interest.',
      follow_up_date: new Date().toISOString(),
    }),
  });
  const actData = await actRes.json();
  console.log('✅ Contact Activity Logged. Activity ID:', actData.data.id);

  console.log('\n--- 4b. LOG CONTACT ACTIVITY (PASSING NBA ID) ---');
  const actRes2 = await fetch(`${baseUrl}/api/outreach/${newNba.id}/activities`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contact_method: 'EMAIL',
      contact_status: 'FOLLOW_UP_REQUIRED',
      notes: 'Follow up summary email dispatched.',
    }),
  });
  const actData2 = await actRes2.json();
  console.log('✅ Contact Activity (via NBA ID resolution) Logged. Activity ID:', actData2.data.id);

  console.log('\n--- 5. RECORD NBA OUTCOME ---');
  const outcomeRes = await fetch(`${baseUrl}/api/nbas/${newNba.id}/outcomes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action_taken: true,
      outcome: 'CONVERTED',
      notes: 'Client completed investment subscription of 2,000,000 INR.',
    }),
  });
  const outcomeData = await outcomeRes.json();
  console.log('✅ NBA Outcome Logged. Outcome ID:', outcomeData.data.id, '| Result:', outcomeData.data.outcome);

  console.log('\n--- 6. VERIFY PERSISTENCE DIRECTLY IN POSTGRESQL ---');
  const nbaInDb = await prisma.nextBestAction.findUnique({ where: { id: newNba.id } });
  const outreachInDb = await prisma.outreach.findUnique({ where: { id: outreachData.data.id } });
  const activitiesInDb = await prisma.contactActivity.findMany({ where: { outreach_id: outreachData.data.id } });
  const outcomeInDb = await prisma.nbaOutcome.findFirst({ where: { nba_id: newNba.id } });

  console.log('📦 PostgreSQL `next_best_actions`: Found =', Boolean(nbaInDb), '| DB Status =', nbaInDb?.status);
  console.log('📦 PostgreSQL `outreaches`: Found =', Boolean(outreachInDb), '| Channel =', outreachInDb?.channel);
  console.log('📦 PostgreSQL `contact_activities`: Stored Count =', activitiesInDb.length);
  console.log('📦 PostgreSQL `nba_outcomes`: Found =', Boolean(outcomeInDb), '| Outcome =', outcomeInDb?.outcome);

  await prisma.$disconnect();
}

verifyFlow().catch((err) => {
  console.error('Flow verification failed:', err);
  process.exit(1);
});
