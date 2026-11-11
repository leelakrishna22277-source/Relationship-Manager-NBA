import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Precomputed standard bcrypt hash for 'Password123!'
const DEFAULT_PASSWORD_HASH = '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm';

async function main() {
  console.log('Seeding BNK-10 PostgreSQL database with 46 clients and 2 RMs...');

  // 1. Clear existing foundational records in order
  await prisma.nbaOutcome.deleteMany({});
  await prisma.contactActivity.deleteMany({});
  await prisma.outreach.deleteMany({});
  await prisma.nextBestAction.deleteMany({});
  await prisma.signal.deleteMany({});
  await prisma.holding.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.rm.deleteMany({});
  await prisma.team.deleteMany({});

  console.log('Cleared existing records.');

  const passwordHash = DEFAULT_PASSWORD_HASH;

  // 2. Create Teams
  const teamNorth = await prisma.team.create({
    data: {
      id: 'team-north',
      name: 'North Zone Wealth Advisory',
    },
  });

  // 3. Create RMs and Team Leads
  const tlSarah = await prisma.rm.create({
    data: {
      id: 'rm-tl-sarah',
      name: 'Sarah Jenkins',
      email: 'tl.sarah@bank.com',
      password_hash: passwordHash,
      role: 'TEAM_LEAD',
      team_id: teamNorth.id,
    },
  });

  await prisma.team.update({
    where: { id: teamNorth.id },
    data: { lead_rm_id: tlSarah.id },
  });

  const rmRajesh = await prisma.rm.create({
    data: {
      id: 'rm-1',
      name: 'Rajesh Kumar',
      email: 'rm.rajesh@bank.com',
      password_hash: passwordHash,
      role: 'RM',
      team_id: teamNorth.id,
    },
  });

  const rmPriya = await prisma.rm.create({
    data: {
      id: 'rm-2',
      name: 'Priya Verma',
      email: 'rm.priya@bank.com',
      password_hash: passwordHash,
      role: 'RM',
      team_id: teamNorth.id,
    },
  });

  console.log('Created RMs: rm-1 (Rajesh Kumar), rm-2 (Priya Verma), Team Lead (Sarah Jenkins)');

  // 4. Create Product Catalog
  await prisma.product.createMany({
    data: [
      { id: 'prod-fd-18m', name: '18-Month High-Yield Fixed Deposit', category: 'FIXED_INCOME', risk_rating: 'LOW', min_investment: 100000, expected_return_bps: 740, tenure_months: 18, tax_treatment: 'TAXABLE', is_active: true },
      { id: 'prod-green-bond', name: 'Sovereign Green Infrastructure Bond', category: 'FIXED_INCOME', risk_rating: 'LOW', min_investment: 250000, expected_return_bps: 785, tenure_months: 60, tax_treatment: 'TAX_EXEMPT', is_active: true },
      { id: 'prod-balanced-adv', name: 'Dynamic Balanced Advantage Fund', category: 'HYBRID', risk_rating: 'MEDIUM', min_investment: 500000, expected_return_bps: 1050, tenure_months: 36, tax_treatment: 'CAPITAL_GAINS', is_active: true },
      { id: 'prod-equity-opp', name: 'Bluechip Alpha Equity Opportunities', category: 'EQUITY', risk_rating: 'HIGH', min_investment: 500000, expected_return_bps: 1420, tenure_months: 60, tax_treatment: 'EQUITY_TAX', is_active: true },
      { id: 'prod-treasury-sweep', name: 'Corporate Liquid Treasury Sweep', category: 'TREASURY', risk_rating: 'LOW', min_investment: 1000000, expected_return_bps: 680, tenure_months: 12, tax_treatment: 'TAXABLE', is_active: true },
    ],
  });

  console.log('Created 5 banking products.');

  // 5. Seed 46 Clients:
  // - 18 clients for rm-1 (Rajesh Kumar)
  // - 18 clients for rm-2 (Priya Verma)
  // - 10 clients unassigned (rm_id: null, "No RM assigned")
  const clientSeedData = [
    // 13 Clients for RM-1 (Rajesh Kumar)
    { id: 'c-101', rm_id: 'rm-1', full_name: 'Vikram Mehta', segment: 'HNI', risk_profile: 'MEDIUM', balance: 4250000 },
    { id: 'c-102', rm_id: 'rm-1', full_name: 'Anita Desai', segment: 'PREMIER', risk_profile: 'LOW', balance: 1850000 },
    { id: 'c-103', rm_id: 'rm-1', full_name: 'Rajesh Patel', segment: 'WEALTH', risk_profile: 'HIGH', balance: 7800000 },
    { id: 'c-104', rm_id: 'rm-1', full_name: 'Kavita Reddy', segment: 'PREMIER', risk_profile: 'LOW', balance: 2100000 },
    { id: 'c-105', rm_id: 'rm-1', full_name: 'Rohan Kapoor', segment: 'HNI', risk_profile: 'MEDIUM', balance: 3400000 },
    { id: 'c-106', rm_id: 'rm-1', full_name: 'Sunita Rao', segment: 'WEALTH', risk_profile: 'HIGH', balance: 6500000 },
    { id: 'c-107', rm_id: 'rm-1', full_name: 'Amit Singhania', segment: 'PREMIER', risk_profile: 'LOW', balance: 1950000 },
    { id: 'c-108', rm_id: 'rm-1', full_name: 'Pooja Bhatt', segment: 'HNI', risk_profile: 'MEDIUM', balance: 4100000 },
    { id: 'c-109', rm_id: 'rm-1', full_name: 'Devendra Joshi', segment: 'PREMIER', risk_profile: 'LOW', balance: 2800000 },
    { id: 'c-110', rm_id: 'rm-1', full_name: 'Ritu Sharma', segment: 'WEALTH', risk_profile: 'HIGH', balance: 8200000 },
    { id: 'c-111', rm_id: 'rm-1', full_name: 'Siddharth Malhotra', segment: 'HNI', risk_profile: 'MEDIUM', balance: 3900000 },
    { id: 'c-112', rm_id: 'rm-1', full_name: 'Meera Nambiar', segment: 'PREMIER', risk_profile: 'LOW', balance: 1750000 },
    { id: 'c-113', rm_id: 'rm-1', full_name: 'Arun Kulkarni', segment: 'HNI', risk_profile: 'MEDIUM', balance: 4600000 },

    // 13 Clients for RM-2 (Priya Verma)
    { id: 'c-201', rm_id: 'rm-2', full_name: 'Sunil Gavaskar', segment: 'HNI', risk_profile: 'MEDIUM', balance: 5500000 },
    { id: 'c-202', rm_id: 'rm-2', full_name: 'Maya Iyer', segment: 'PREMIER', risk_profile: 'LOW', balance: 2200000 },
    { id: 'c-203', rm_id: 'rm-2', full_name: 'Alok Nath', segment: 'WEALTH', risk_profile: 'HIGH', balance: 6800000 },
    { id: 'c-204', rm_id: 'rm-2', full_name: 'Shilpa Shetty', segment: 'HNI', risk_profile: 'MEDIUM', balance: 4800000 },
    { id: 'c-205', rm_id: 'rm-2', full_name: 'Harsh Goenka', segment: 'WEALTH', risk_profile: 'HIGH', balance: 8900000 },
    { id: 'c-206', rm_id: 'rm-2', full_name: 'Preity Zinta', segment: 'PREMIER', risk_profile: 'LOW', balance: 2150000 },
    { id: 'c-207', rm_id: 'rm-2', full_name: 'Sanjay Dutt', segment: 'HNI', risk_profile: 'MEDIUM', balance: 3750000 },
    { id: 'c-208', rm_id: 'rm-2', full_name: 'Tanya Mittal', segment: 'PREMIER', risk_profile: 'LOW', balance: 1950000 },
    { id: 'c-209', rm_id: 'rm-2', full_name: 'Kunal Shah', segment: 'WEALTH', risk_profile: 'HIGH', balance: 9500000 },
    { id: 'c-210', rm_id: 'rm-2', full_name: 'Divya Khosla', segment: 'HNI', risk_profile: 'MEDIUM', balance: 3600000 },
    { id: 'c-211', rm_id: 'rm-2', full_name: 'Gaurav Munjal', segment: 'WEALTH', risk_profile: 'HIGH', balance: 7200000 },
    { id: 'c-212', rm_id: 'rm-2', full_name: 'Vandana Luthra', segment: 'PREMIER', risk_profile: 'LOW', balance: 2400000 },
    { id: 'c-213', rm_id: 'rm-2', full_name: 'Rahul Bajaj', segment: 'HNI', risk_profile: 'MEDIUM', balance: 5100000 },

    // 20 Additional Clients assigned equally to RM Rajesh (rm-1) and RM Priya (rm-2) (23 clients each)
    { id: 'c-301', rm_id: 'rm-1', full_name: 'Aakash Ambani', segment: 'WEALTH', risk_profile: 'HIGH', balance: 15000000 },
    { id: 'c-302', rm_id: 'rm-1', full_name: 'Isha Piramal', segment: 'WEALTH', risk_profile: 'MEDIUM', balance: 11000000 },
    { id: 'c-303', rm_id: 'rm-1', full_name: 'Anant Birla', segment: 'HNI', risk_profile: 'MEDIUM', balance: 5800000 },
    { id: 'c-304', rm_id: 'rm-1', full_name: 'Tara Sutaria', segment: 'PREMIER', risk_profile: 'LOW', balance: 2100000 },
    { id: 'c-305', rm_id: 'rm-1', full_name: 'Aditya Roy', segment: 'PREMIER', risk_profile: 'LOW', balance: 1900000 },
    { id: 'c-306', rm_id: 'rm-1', full_name: 'Kiara Advani', segment: 'HNI', risk_profile: 'MEDIUM', balance: 4200000 },
    { id: 'c-307', rm_id: 'rm-1', full_name: 'Ayushmann Khurrana', segment: 'HNI', risk_profile: 'MEDIUM', balance: 3700000 },
    { id: 'c-308', rm_id: 'rm-1', full_name: 'Kriti Sanon', segment: 'PREMIER', risk_profile: 'LOW', balance: 2600000 },
    { id: 'c-309', rm_id: 'rm-1', full_name: 'Vicky Kaushal', segment: 'HNI', risk_profile: 'HIGH', balance: 4800000 },
    { id: 'c-310', rm_id: 'rm-1', full_name: 'Katrina Turcotte', segment: 'WEALTH', risk_profile: 'HIGH', balance: 8300000 },
    { id: 'c-311', rm_id: 'rm-2', full_name: 'Neha Agarwal', segment: 'WEALTH', risk_profile: 'HIGH', balance: 9100000 },
    { id: 'c-312', rm_id: 'rm-2', full_name: 'Farhan Akhtar', segment: 'PREMIER', risk_profile: 'LOW', balance: 2300000 },
    { id: 'c-313', rm_id: 'rm-2', full_name: 'Deepa Chopra', segment: 'HNI', risk_profile: 'MEDIUM', balance: 3800000 },
    { id: 'c-314', rm_id: 'rm-2', full_name: 'Varun Dhawan', segment: 'WEALTH', risk_profile: 'HIGH', balance: 7400000 },
    { id: 'c-315', rm_id: 'rm-2', full_name: 'Swati Sengupta', segment: 'PREMIER', risk_profile: 'LOW', balance: 2050000 },
    { id: 'c-316', rm_id: 'rm-2', full_name: 'Kiran Mazumdar', segment: 'WEALTH', risk_profile: 'HIGH', balance: 8400000 },
    { id: 'c-317', rm_id: 'rm-2', full_name: 'Rakesh Jhunjhunwala', segment: 'WEALTH', risk_profile: 'HIGH', balance: 12500000 },
    { id: 'c-318', rm_id: 'rm-2', full_name: 'Radhika Gupta', segment: 'PREMIER', risk_profile: 'LOW', balance: 2900000 },
    { id: 'c-319', rm_id: 'rm-2', full_name: 'Nandan Nilekani', segment: 'HNI', risk_profile: 'MEDIUM', balance: 6100000 },
    { id: 'c-320', rm_id: 'rm-2', full_name: 'Roshni Nadar', segment: 'WEALTH', risk_profile: 'HIGH', balance: 7900000 },
  ];

  console.log(`Seeding ${clientSeedData.length} clients...`);

  const CLIENT_DAY_OPTIONS = [4, 11, 16, 21, 25, 28];
  for (let i = 0; i < clientSeedData.length; i++) {
    const c = clientSeedData[i];
    const month = i % 12; // 0 (Jan) to 11 (Dec)
    const day = CLIENT_DAY_OPTIONS[(i * 3 + Math.floor(i / 4)) % CLIENT_DAY_OPTIONS.length];
    const createdAt2021 = new Date(Date.UTC(2021, month, day, 10, 0, 0));

    const emailName = c.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const createdClient = await prisma.client.create({
      data: {
        id: c.id,
        rm_id: c.rm_id,
        full_name: c.full_name,
        segment: c.segment,
        risk_profile: c.risk_profile,
        client_since: createdAt2021,
        kyc_status: 'VERIFIED',
        tax_residency: 'DOMESTIC',
        email: `${emailName}@apexclient.com`,
        phone: '+91 98' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8),
        total_balance: c.balance,
        created_at: createdAt2021,
      },
    });

    // Create 1-2 holdings for client
    const p1Id = c.risk_profile === 'HIGH' ? 'prod-equity-opp' : 'prod-fd-18m';
    const isMaturity = c.risk_profile === 'LOW' || c.id === 'c-101' || c.id === 'c-102';
    const matDate = isMaturity ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;
    const p1StartDate = matDate
      ? new Date(matDate.getTime() - 18 * 30 * 24 * 60 * 60 * 1000)
      : new Date(createdAt2021.getTime() + 60 * 24 * 60 * 60 * 1000);
    const p1Rate = p1Id === 'prod-equity-opp' ? 1420 : 740;
    const p1Acc = p1Id === 'prod-equity-opp' ? `EQ-1049-${3000 + i}` : `FD-7741-${1000 + i}`;

    await prisma.holding.create({
      data: {
        id: `h-${c.id}-1`,
        client_id: createdClient.id,
        product_id: p1Id,
        account_number: p1Acc,
        start_date: p1StartDate,
        interest_rate_bps: p1Rate,
        currency: 'USD',
        status: 'ACTIVE',
        balance: c.balance * 0.6,
        maturity_date: matDate,
        created_at: p1StartDate,
      },
    });

    const p2Id = c.risk_profile === 'LOW' ? 'prod-green-bond' : 'prod-balanced-adv';
    const p2StartDate = new Date(createdAt2021.getTime() + 120 * 24 * 60 * 60 * 1000);
    const p2Rate = p2Id === 'prod-green-bond' ? 785 : 1050;
    const p2Acc = p2Id === 'prod-green-bond' ? `BD-8821-${2000 + i}` : `MF-5512-${4000 + i}`;

    await prisma.holding.create({
      data: {
        id: `h-${c.id}-2`,
        client_id: createdClient.id,
        product_id: p2Id,
        account_number: p2Acc,
        start_date: p2StartDate,
        interest_rate_bps: p2Rate,
        currency: 'USD',
        status: 'ACTIVE',
        balance: c.balance * 0.4,
        maturity_date: null,
        created_at: p2StartDate,
      },
    });

    // Seed grounded signals and initial NBAs for assigned clients
    if (c.rm_id) {
      if (c.risk_profile === 'LOW' || c.id === 'c-101' || c.id === 'c-102' || c.id === 'c-201') {
        const sig = await prisma.signal.create({
          data: {
            id: `sig-${c.id}-mat`,
            client_id: createdClient.id,
            type: 'FD_MATURITY_APPROACHING',
            data: { days_remaining: 14, principal: Math.round(c.balance * 0.6) },
            status: 'ACTIVE',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            detected_at: new Date(),
          },
        });

        await prisma.nextBestAction.create({
          data: {
            id: `nba-${c.id}`,
            client_id: createdClient.id,
            action_type: 'DEPOSIT_ROLLOVER',
            title: `Recommend Reinvestment for Maturing FD (${c.full_name})`,
            reason: 'High-yield Fixed Deposit maturing in 14 days. Proactive rollover protects yield.',
            evidence: [
              {
                type: 'SIGNAL',
                record_id: sig.id,
                summary: 'Maturity signal: 14 days remaining',
                details: `Principal: ₹${Math.round(c.balance * 0.6).toLocaleString()}`,
              },
              {
                type: 'HOLDING',
                record_id: `h-${c.id}-1`,
                summary: '18-Month High-Yield Fixed Deposit position',
                details: 'Maturing in 14 days',
              },
            ],
            priority: 'HIGH',
            status: 'PENDING',
            suggested_product_id: 'prod-green-bond',
            confidence: 0.94,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            suitability: {
              is_suitable: true,
              overall_status: 'PASS',
              rules: [
                { id: 'RISK_ALIGNMENT', name: 'Risk Tolerance Alignment', status: 'PASS', details: `Client risk profile (${c.risk_profile}) aligns with Sovereign Green Infrastructure Bond risk rating (LOW). Capital preservation mandate protects principal.` },
                { id: 'MIN_THRESHOLD', name: 'Maturing Principal & Reinvestment Ticket Sizing', status: 'PASS', details: `Maturing deposit principal ($${Math.round(c.balance * 0.6).toLocaleString()}) exceeds the minimum investment threshold ($250,000) for Sovereign Green Infrastructure Bond, enabling seamless 100% principal rollover without cash drag.` },
                { id: 'DUPLICATE_PRODUCT', name: 'Deposit Maturity Timing & Rollover Eligibility', status: 'PASS', details: 'Verified fixed deposit maturity window (within 14-30 days). No early breakage penalty applies; reinvestment terms preserve continuous yield accrual.' },
              ],
            },
          },
        });
      } else if (c.risk_profile === 'HIGH') {
        const sig = await prisma.signal.create({
          data: {
            id: `sig-${c.id}-inf`,
            client_id: createdClient.id,
            type: 'LARGE_INFLOW',
            data: { amount: Math.round(c.balance * 0.25), account: 'Primary Wealth Liquidity' },
            status: 'ACTIVE',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            detected_at: new Date(),
          },
        });

        await prisma.nextBestAction.create({
          data: {
            id: `nba-${c.id}`,
            client_id: createdClient.id,
            action_type: 'INVESTMENT_ALLOCATION',
            title: `Deploy Liquid Inflow into Growth Equity (${c.full_name})`,
            reason: `Liquid inflow of ₹${Math.round(c.balance * 0.25).toLocaleString()} detected. Deploying capital prevents cash drag.`,
            evidence: [
              {
                type: 'SIGNAL',
                record_id: sig.id,
                summary: `Large inflow signal: ₹${Math.round(c.balance * 0.25).toLocaleString()}`,
                details: 'Primary Wealth Liquidity account',
              },
              {
                type: 'HOLDING',
                record_id: `h-${c.id}-1`,
                summary: 'Active equity holding foundation',
                details: 'Aligned with aggressive growth profile',
              },
            ],
            priority: 'MEDIUM',
            status: 'PENDING',
            suggested_product_id: 'prod-equity-opp',
            confidence: 0.88,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            suitability: {
              is_suitable: true,
              overall_status: 'PASS',
              rules: [
                { id: 'RISK_ALIGNMENT', name: 'Risk Tolerance Alignment', status: 'PASS', details: `Client risk profile (${c.risk_profile}) matches Bluechip Alpha Equity Opportunities risk rating (HIGH). Growth equity profile supports capital deployment.` },
                { id: 'MIN_THRESHOLD', name: 'Liquid Inflow Sufficiency & Minimum Ticket Size', status: 'PASS', details: `Verified liquid inflow tranche ($${Math.round(c.balance * 0.25).toLocaleString()}) exceeds the product minimum investment threshold ($500,000), leaving substantial operating reserves intact.` },
                { id: 'CONCENTRATION_LIMIT', name: 'Single-Asset Concentration Cap (35%)', status: 'PASS', details: `Proposed allocation of $${Math.round(c.balance * 0.25).toLocaleString()} represents 25.0% of total AUM ($${c.balance.toLocaleString()}), remaining within the mandatory 35% single-asset concentration ceiling.` },
                { id: 'DUPLICATE_PRODUCT', name: 'Portfolio Diversification & Conflict Check', status: 'PASS', details: 'Client portfolio structure verified: Growth allocation expands core equity exposure without conflicting product lock-ins or unhedged concentration risks.' },
              ],
            },
          },
        });
      } else {
        const sig = await prisma.signal.create({
          data: {
            id: `sig-${c.id}-drf`,
            client_id: createdClient.id,
            type: 'PORTFOLIO_DRIFT',
            data: { drift_pct: '9.2% equity overweight', days_active: 7 },
            status: 'ACTIVE',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            detected_at: new Date(),
          },
        });

        await prisma.nextBestAction.create({
          data: {
            id: `nba-${c.id}`,
            client_id: createdClient.id,
            action_type: 'PORTFOLIO_REBALANCE',
            title: `Portfolio Allocation Drift Review (${c.full_name})`,
            reason: 'Portfolio has drifted 9.2% above benchmark equity weighting. Rebalance to preserve target risk profile.',
            evidence: [
              {
                type: 'SIGNAL',
                record_id: sig.id,
                summary: 'Portfolio drift signal: 9.2% equity overweight',
                details: 'Active for 7 days',
              },
              {
                type: 'HOLDING',
                record_id: `h-${c.id}-2`,
                summary: 'Dynamic Balanced Advantage Fund allocation',
                details: 'Recommended vehicle for rebalancing',
              },
            ],
            priority: 'MEDIUM',
            status: 'PENDING',
            suggested_product_id: 'prod-balanced-adv',
            confidence: 0.86,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            suitability: {
              is_suitable: true,
              overall_status: 'PASS',
              rules: [
                { id: 'RISK_ALIGNMENT', name: 'Risk Tolerance Alignment', status: 'PASS', details: `Dynamic Balanced Advantage Fund (Risk: MEDIUM) aligns with client target risk profile (${c.risk_profile}), moderating equity volatility.` },
                { id: 'MIN_THRESHOLD', name: 'Minimum Rebalancing Ticket Size', status: 'PASS', details: `Rebalancing tranche size ($${Math.round(c.balance * 0.092).toLocaleString()}) satisfies minimum transaction threshold ($500,000) funded via overweight equity trim.` },
                { id: 'CONCENTRATION_LIMIT', name: 'Asset Allocation Band & Concentration Limit', status: 'PASS', details: 'Rebalancing realignment brings equity exposure back within target policy band (< 60%), eliminating portfolio allocation drift.' },
                { id: 'DUPLICATE_PRODUCT', name: 'Transaction Conflict & Holding Compatibility', status: 'PASS', details: 'Active hybrid vehicle verified; no conflicting lock-in restrictions, wash sale violations, or pending settlement orders.' },
              ],
            },
          },
        });
      }
    }
  }

  // 8. Seed Sample Historical Outreaches, Contact Activities, and Outcomes
  const outreach1 = await prisma.outreach.create({
    data: {
      id: 'outreach-seed-1',
      nba_id: 'nba-c-101',
      created_by_rm_id: 'rm-1',
      draft_text: 'Dear Vikram,\n\nWe noticed your 12-month fixed deposit is nearing maturity. To maximize your yield while preserving capital, we recommend locking in our 18-Month High-Yield Fixed Deposit at 7.40% p.a.\n\nBest regards,\nRajesh Kumar',
      channel: 'EMAIL',
      tone: 'ADVISORY',
      subject: 'Portfolio Optimization: High-Yield Fixed Deposit Opportunity',
      status: 'APPROVED',
    },
  });

  await prisma.contactActivity.createMany({
    data: [
      {
        id: 'activity-seed-1',
        outreach_id: outreach1.id,
        rm_id: 'rm-1',
        contact_method: 'CALL',
        contact_status: 'CONTACTED',
        notes: 'Discussed reinvestment rates with client. Client expressed strong interest in 18-month duration.',
        follow_up_date: new Date('2026-11-10T10:00:00Z'),
      },
      {
        id: 'activity-seed-2',
        outreach_id: outreach1.id,
        rm_id: 'rm-1',
        contact_method: 'EMAIL',
        contact_status: 'FOLLOW_UP_REQUIRED',
        notes: 'Dispatched formal product term sheet and documentation checklist to client inbox.',
      },
    ],
  });

  const outreach2 = await prisma.outreach.create({
    data: {
      id: 'outreach-seed-2',
      nba_id: 'nba-c-102',
      created_by_rm_id: 'rm-2',
      draft_text: 'Dear Ananya,\n\nBased on your recent portfolio equity expansion, we recommend rebalancing into our Dynamic Balanced Advantage Fund to safeguard gains.\n\nWarm regards,\nPriya Verma',
      channel: 'EMAIL',
      tone: 'ADVISORY',
      subject: 'Portfolio Rebalancing Advisory',
      status: 'APPROVED',
    },
  });

  await prisma.contactActivity.create({
    data: {
      id: 'activity-seed-3',
      outreach_id: outreach2.id,
      rm_id: 'rm-2',
      contact_method: 'CALL',
      contact_status: 'COMPLETED',
      notes: 'Held quarterly review call. Client approved portfolio rebalance.',
    },
  });

  await prisma.nbaOutcome.create({
    data: {
      id: 'outcome-seed-1',
      nba_id: 'nba-c-102',
      recorded_by_rm_id: 'rm-2',
      action_taken: true,
      outcome: 'CONVERTED',
      notes: 'Client authorized rebalancing transfer of ₹1,500,000 into Dynamic Balanced Advantage Fund.',
    },
  });

  await prisma.nextBestAction.update({
    where: { id: 'nba-c-102' },
    data: { status: 'COMPLETED' },
  });

  const assignedCount = clientSeedData.filter(c => c.rm_id !== null).length;
  const unassignedCount = clientSeedData.filter(c => c.rm_id === null).length;
  const rm1Count = clientSeedData.filter(c => c.rm_id === 'rm-1').length;
  const rm2Count = clientSeedData.filter(c => c.rm_id === 'rm-2').length;

  console.log(`✅ Database successfully seeded with ${clientSeedData.length} clients:`);
  console.log(`   - RM 1 (Rajesh Kumar): ${rm1Count} clients`);
  console.log(`   - RM 2 (Priya Verma): ${rm2Count} clients`);
  console.log(`   - Total Assigned: ${assignedCount} clients`);
  console.log(`   - Unassigned ("No RM assigned"): ${unassignedCount} clients`);
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
