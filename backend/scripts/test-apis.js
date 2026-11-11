async function runExhaustiveTests() {
  const baseUrl = 'http://localhost:3000/api';
  console.log('Starting Complete End-to-End API Test Suite against PostgreSQL...\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  // 1. Health & Database connectivity
  const health = await fetch(`${baseUrl}/health`).then((r) => r.json());
  assert(health.status === 'UP' && health.database === 'CONNECTED', '1. GET /api/health (Database Connected)');

  // 2. RM Login (Rajesh Kumar)
  const rmLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rm.rajesh@bank.com', password: 'Password123!', role: 'RM' }),
  }).then((r) => r.json());
  assert(rmLogin.success === true && rmLogin.data?.token, '2. POST /api/auth/login (RM Authentication)');
  const rmToken = rmLogin.data.token;

  // 3. RM Verify Me
  const rmMe = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(rmMe.data?.email === 'rm.rajesh@bank.com' && rmMe.data?.role === 'RM', '3. GET /api/auth/me (Current Session)');

  // 4. RM Client Directory (Scoped to RM)
  const rmClients = await fetch(`${baseUrl}/clients`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(rmClients.data?.length === 23, '4. GET /api/clients (RM Isolation - 23 clients returned)');

  // 5. RM Per-RM Isolation Security Check (Accessing RM Priya's client c-201 -> 403 Forbidden)
  const forbiddenClient = await fetch(`${baseUrl}/clients/c-201`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  });
  assert(forbiddenClient.status === 403, '5. GET /api/clients/c-201 (Security - 403 Forbidden on Other RM Client)');

  // 6. RM Client 360 Details (c-101 Vikram Mehta)
  const c101 = await fetch(`${baseUrl}/clients/c-101`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(c101.data?.full_name === 'Vikram Mehta' && c101.data?.segment === 'HNI', '6. GET /api/clients/c-101 (Client 360 Profile)');

  // 7. Client Holdings (c-101)
  const c101Holdings = await fetch(`${baseUrl}/clients/c-101/holdings`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(c101Holdings.data?.length >= 1 && c101Holdings.data[0]?.product?.name, '7. GET /api/clients/c-101/holdings (Holdings with Product Names)');

  // 8. Client Signals
  const c101Signals = await fetch(`${baseUrl}/clients/c-101/signals`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(Array.isArray(c101Signals.data), '8. GET /api/clients/c-101/signals (Client Signals List)');

  // 9. Client NBAs
  const c101Nbas = await fetch(`${baseUrl}/clients/c-101/nbas`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(Array.isArray(c101Nbas.data), '9. GET /api/clients/c-101/nbas (Client Recommendations)');

  // 10. RM Portfolio Overview Dashboard
  const rmDash = await fetch(`${baseUrl}/rm/dashboard`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(rmDash.data?.assignedClientsCount === 23 && rmDash.data?.totalAum > 0, '10. GET /api/rm/dashboard (RM AUM & Metrics)');

  // 11. RM Outcome History
  const rmOutcomes = await fetch(`${baseUrl}/rm/outcomes`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(Array.isArray(rmOutcomes.data), '11. GET /api/rm/outcomes (RM Closed-Loop History)');

  // 12. Product Catalog List
  const products = await fetch(`${baseUrl}/products`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(products.data?.length === 5, '12. GET /api/products (Complete 5 Products Catalog)');

  // 13. Single Product Detail
  const p1 = await fetch(`${baseUrl}/products/prod-fd-18m`, {
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(p1.data?.name === '18-Month High-Yield Fixed Deposit', '13. GET /api/products/prod-fd-18m (Single Product Detail)');

  // 14. Team Lead Login (Sarah Jenkins)
  const tlLogin = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tl.sarah@bank.com', password: 'Password123!', role: 'TEAM_LEAD' }),
  }).then((r) => r.json());
  assert(tlLogin.success === true && tlLogin.data?.user?.role === 'TEAM_LEAD', '14. POST /api/auth/login (Team Lead Authentication)');
  const tlToken = tlLogin.data.token;

  // 15. Team Lead Supervisory Dashboard
  const tlDash = await fetch(`${baseUrl}/team-lead/dashboard`, {
    headers: { Authorization: `Bearer ${tlToken}` },
  }).then((r) => r.json());
  assert(tlDash.data?.teamName === 'North Zone Wealth Advisory' && tlDash.data?.totalClients === 46, '15. GET /api/team-lead/dashboard (Supervisor Analytics with 46 Clients)');

  // 16. Team Lead RMs List
  const tlRms = await fetch(`${baseUrl}/team-lead/rms`, {
    headers: { Authorization: `Bearer ${tlToken}` },
  }).then((r) => r.json());
  assert(tlRms.data?.length === 2, '16. GET /api/team-lead/rms (Advisory Team Members)');

  // 17. Team Lead Supervisory Client View (Pagination with 46 Total Clients)
  const tlClients = await fetch(`${baseUrl}/clients?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${tlToken}` },
  }).then((r) => r.json());
  assert(tlClients.data?.length === 10 && tlClients.meta?.total === 46 && tlClients.meta?.totalPages === 5, '17. GET /api/clients (Team Lead View - 46 Clients Paginated at 10)');

  // 18. Team Lead Client Assignment
  const assignTest = await fetch(`${baseUrl}/clients/c-301/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tlToken}` },
    body: JSON.stringify({ rm_id: 'rm-2' }),
  }).then((r) => r.json());
  assert(assignTest.data?.rm_id === 'rm-2', '18. PATCH /api/clients/c-301/assign (Assign Client to RM)');
  // Revert back to rm-1 to maintain equal 23/23 split
  await fetch(`${baseUrl}/clients/c-301/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tlToken}` },
    body: JSON.stringify({ rm_id: 'rm-1' }),
  });

  // 19. Team Lead Outcomes Audit
  const tlOutcomes = await fetch(`${baseUrl}/team-lead/outcomes`, {
    headers: { Authorization: `Bearer ${tlToken}` },
  }).then((r) => r.json());
  assert(Array.isArray(tlOutcomes.data), '19. GET /api/team-lead/outcomes (Team Outcomes Audit)');

  // 20. AI Pipeline: Generate Grounded NBAs with Suitability Guard
  const aiGenerate = await fetch(`${baseUrl}/clients/c-101/nbas/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${rmToken}` },
  }).then((r) => r.json());
  assert(
    aiGenerate.success === true &&
    Array.isArray(aiGenerate.data?.recommendations) &&
    aiGenerate.data.recommendations.length > 0 &&
    aiGenerate.data.recommendations[0]?.suitability?.overall_status === 'PASS',
    '20. POST /api/clients/:id/nbas/generate (AI Grounded LangGraph NBA Pipeline)'
  );
  const generatedNbaId = aiGenerate.data.recommendations[0].id;

  // 21. AI Pipeline: Draft Grounded Outreach with Citations & Guardrails
  const aiOutreach = await fetch(`${baseUrl}/nbas/${generatedNbaId}/outreach/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rmToken}` },
    body: JSON.stringify({ tone: 'ADVISORY', channel: 'EMAIL', custom_instructions: 'Ensure competitive rate' }),
  }).then((r) => r.json());
  assert(
    aiOutreach.success === true &&
    aiOutreach.data?.subject &&
    aiOutreach.data?.body &&
    Array.isArray(aiOutreach.data?.grounding_citations) &&
    aiOutreach.data.grounding_citations.length > 0,
    '21. POST /api/nbas/:id/outreach/draft (AI Grounded Outreach Generator with Citations)'
  );

  console.log(`\n=================================================`);
  console.log(`🎉 ALL ${passed}/${total} API ENDPOINTS VERIFIED & WORKING 100%!`);
  console.log(`=================================================`);
}

runExhaustiveTests().catch((err) => {
  console.error('\n❌ Test Failure:', err.message);
  process.exit(1);
});
