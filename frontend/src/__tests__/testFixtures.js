export const MOCK_CLIENTS = [
  {
    id: "c-101",
    rm_id: "rm-1",
    full_name: "Vikram Mehta",
    email: "vikram.mehta@enterprise.com",
    phone: "+91 98201 44521",
    segment: "HNI",
    risk_profile: "MODERATE",
    total_balance: 425e4,
    holdings_count: 5,
    signals_count: 2,
    active_nbas_count: 2,
    created_at: "2021-01-04T09:00:00Z"
  },
  {
    id: "c-102",
    rm_id: "rm-1",
    full_name: "Anita Desai",
    email: "anita.desai@innovate.in",
    phone: "+91 98110 33412",
    segment: "PREMIER",
    risk_profile: "CONSERVATIVE",
    total_balance: 185e4,
    holdings_count: 4,
    signals_count: 1,
    active_nbas_count: 1,
    created_at: "2021-02-21T10:30:00Z"
  },
  {
    id: "c-103",
    rm_id: "rm-1",
    full_name: "Rajesh Patel",
    email: "rajesh.patel@globalholdings.com",
    phone: "+91 99099 88123",
    segment: "WEALTH",
    risk_profile: "AGGRESSIVE",
    total_balance: 78e5,
    holdings_count: 7,
    signals_count: 3,
    active_nbas_count: 1,
    created_at: "2021-03-04T14:15:00Z"
  },
  {
    id: "c-104",
    rm_id: "rm-1",
    full_name: "Kavita Reddy",
    email: "kavita.reddy@biotech.org",
    phone: "+91 97400 12890",
    segment: "PREMIER",
    risk_profile: "CONSERVATIVE",
    total_balance: 21e5,
    holdings_count: 3,
    signals_count: 1,
    active_nbas_count: 1,
    created_at: "2021-04-21T11:00:00Z"
  },
  {
    id: "c-105",
    rm_id: "rm-1",
    full_name: "Suresh Menon",
    email: "suresh.menon@apexshipping.com",
    phone: "+91 98450 77611",
    segment: "HNI",
    risk_profile: "MODERATE",
    total_balance: 56e5,
    holdings_count: 6,
    signals_count: 2,
    active_nbas_count: 0,
    created_at: "2021-05-11T08:45:00Z"
  }
];
export const MOCK_HOLDINGS = {
  "c-101": [
    {
      id: "h-1",
      client_id: "c-101",
      asset_type: "FIXED_DEPOSIT",
      name: "12-Month Apex Senior Tier FD",
      value: 15e5,
      currency: "INR",
      interest_rate_bps: 710,
      maturity_date: "2026-11-15T00:00:00Z",
      created_at: "2025-11-15T00:00:00Z"
    },
    {
      id: "h-2",
      client_id: "c-101",
      asset_type: "TREASURY_BILL",
      name: "364-Day Sovereign T-Bill",
      value: 12e5,
      currency: "INR",
      interest_rate_bps: 685,
      maturity_date: "2027-04-10T00:00:00Z",
      created_at: "2026-04-10T00:00:00Z"
    },
    {
      id: "h-3",
      client_id: "c-101",
      asset_type: "SAVINGS_ACCOUNT",
      name: "Private Wealth Checking Account",
      value: 155e4,
      currency: "INR",
      interest_rate_bps: 350,
      created_at: "2025-01-15T00:00:00Z"
    }
  ]
};
export const MOCK_SIGNALS = {
  "c-101": [
    {
      id: "sig-1",
      client_id: "c-101",
      type: "DEPOSIT_MATURITY",
      data: {
        amount: 15e5,
        holding_name: "12-Month Apex Senior Tier FD",
        days_to_maturity: 12,
        current_rate_bps: 710,
        suggested_rate_bps: 740
      },
      detected_at: "2026-11-03T08:00:00Z",
      created_at: "2026-11-03T08:00:00Z"
    },
    {
      id: "sig-2",
      client_id: "c-101",
      type: "LARGE_DEPOSIT",
      data: {
        amount: 65e4,
        source: "Corporate Dividend Distribution",
        timestamp: "2026-10-28T14:30:00Z"
      },
      detected_at: "2026-10-28T14:30:00Z",
      created_at: "2026-10-28T14:30:00Z"
    }
  ]
};
export const MOCK_NBAS = [
  {
    id: "nba-101",
    client_id: "c-101",
    action_type: "DEPOSIT_ROLLOVER",
    title: "Roll over maturing FD to 18M Apex Premier Fixed Deposit",
    reason: "Client has \u20B91,500,000 fixed deposit maturing in 12 days; current promotional rate offers 7.40% p.a. (+30 bps yield enhancement).",
    priority: "HIGH",
    status: "ACTIVE",
    generated_at: "2026-11-03T08:30:00Z",
    created_at: "2026-11-03T08:30:00Z",
    evidence: [
      {
        id: "ev-1",
        type: "SIGNAL_DATA",
        description: "Fixed deposit maturity signal detected for holding #h-1 maturing on 15-Nov-2026.",
        details: "Deposit principal: \u20B91,500,000 | Current yield: 7.10%"
      },
      {
        id: "ev-2",
        type: "POLICY_RULE",
        description: "POL-SUIT-2026-V1 Section 4.2: Term deposit renewals preserve capital preservation mandate.",
        rule: "RISK_CAPITAL_PRESERVATION_COMPLIANT"
      },
      {
        id: "ev-3",
        type: "YIELD_OPPORTUNITY",
        description: "New 18-Month tranche offers 7.40% p.a., securing +30 bps enhancement above maturing rate."
      }
    ],
    client: MOCK_CLIENTS[0],
    suitability: {
      status: "PASS",
      overall_status: "PASS",
      score: 95,
      evaluated_at: "2026-11-03T08:30:00Z",
      summary: "Deterministic Suitability Check PASSED all regulatory & bank risk requirements.",
      rules: [
        {
          id: "rule-risk",
          name: "Risk Profile Compatibility",
          status: "PASS",
          details: "Client risk profile (MODERATE) aligns with 18-Month High-Yield Fixed Deposit risk rating (LOW). Capital preservation mandate protects principal.",
          reason: "Product risk (LOW) is within client risk tolerance (MODERATE)."
        },
        {
          id: "rule-min-inv",
          name: "Maturing Principal & Reinvestment Ticket Sizing",
          status: "PASS",
          details: "Maturing deposit principal ($1,500,000) exceeds the minimum investment threshold ($100,000), enabling seamless 100% principal rollover without cash drag.",
          reason: "Deposit amount ₹1,500,000 satisfies minimum investment requirement of ₹100,000."
        },
        {
          id: "rule-maturity",
          name: "Deposit Maturity Timing & Rollover Eligibility",
          status: "PASS",
          details: "Verified fixed deposit maturity window (within 12 days). No early breakage penalty applies; reinvestment terms preserve continuous yield accrual.",
          reason: "Verified deposit is within 14-day renewal eligibility window."
        }
      ]
    }
  },
  {
    id: "nba-102",
    client_id: "c-102",
    action_type: "SOVEREIGN_BOND",
    title: "Allocate excess liquidity into 3-Year Sovereign Green Bond",
    reason: "Client maintains \u20B91,850,000 in low-yielding savings account; sovereign bond offers capital security with 7.15% semi-annual coupon.",
    priority: "MEDIUM",
    status: "ACTIVE",
    generated_at: "2026-11-02T11:00:00Z",
    created_at: "2026-11-02T11:00:00Z",
    evidence: [
      {
        id: "ev-4",
        type: "LIQUIDITY_SURPLUS",
        description: "Cash balance exceeds 6 months operational reserve threshold by \u20B9950,000."
      }
    ],
    client: MOCK_CLIENTS[1],
    suitability: {
      status: "PASS",
      overall_status: "PASS",
      score: 92,
      evaluated_at: "2026-11-02T11:00:00Z",
      summary: "Conservative sovereign debt vehicle fully conforms with client risk constraints.",
      rules: [
        {
          id: "rule-risk",
          name: "Risk Classification Check",
          status: "PASS",
          details: "Client risk profile (LOW) matches Sovereign Green Bond risk rating (LOW). Sovereign paper meets Conservative risk tier requirements.",
          reason: "Sovereign paper meets Conservative risk tier requirements."
        },
        {
          id: "rule-min-inv",
          name: "Liquid Surplus Sufficiency & Minimum Ticket Size",
          status: "PASS",
          details: "Deployable liquidity ($950,000) satisfies bond minimum threshold ($250,000) while keeping 6-month operational reserves intact.",
          reason: "Deployable liquidity exceeds minimum investment threshold."
        },
        {
          id: "rule-concentration",
          name: "Single-Asset & Sovereign Exposure Cap (35%)",
          status: "PASS",
          details: "Target allocation represents 27.0% of total AUM ($1,850,000), fully compliant with institutional concentration limits.",
          reason: "Allocation complies with 35% concentration cap."
        },
        {
          id: "rule-conflict",
          name: "Tenor & Liquidity Horizon Suitability",
          status: "PASS",
          details: "Client 3-year liquidity horizon aligns with bond maturity; confirmed zero overlapping lockups or near-term capital commitments.",
          reason: "No overlapping lockup conflicts."
        }
      ]
    }
  },
  {
    id: "nba-103",
    client_id: "c-103",
    action_type: "STRUCTURED_NOTE",
    title: "Participate in Capital-Protected Equity-Linked Tranche",
    reason: "Aggressive risk tier client seeking market upside with 100% principal protection at maturity.",
    priority: "HIGH",
    status: "ACTIVE",
    generated_at: "2026-11-01T15:20:00Z",
    created_at: "2026-11-01T15:20:00Z",
    evidence: [
      {
        id: "ev-5",
        type: "MARKET_OPPORTUNITY",
        description: "Tranche closing in 5 business days; suitable for Aggressive wealth tier."
      }
    ],
    client: MOCK_CLIENTS[2],
    suitability: {
      status: "PASS",
      overall_status: "PASS",
      score: 88,
      evaluated_at: "2026-11-01T15:20:00Z",
      summary: "Structured product suitability verified for accredited wealth client.",
      rules: [
        {
          id: "rule-risk",
          name: "Risk Profile Compatibility",
          status: "PASS",
          details: "Client risk profile (HIGH) matches Structured Note risk classification (HIGH). Accredited Wealth mandate permits principal-protected market participation.",
          reason: "Risk tier aligns with structured vehicle."
        },
        {
          id: "rule-s1",
          name: "Accreditation & Net Worth",
          status: "PASS",
          details: "Client AUM ($7,800,000) exceeds $5,000,000 fiduciary accreditation benchmark for complex financial instruments.",
          reason: "Client AUM > ₹5,000,000 fulfills complex product requirements."
        },
        {
          id: "rule-concentration",
          name: "Structured Tranche Concentration Cap (20%)",
          status: "PASS",
          details: "Proposed structured allocation of $500,000 represents 6.4% of total AUM, well within internal 20% cap for non-standard instruments.",
          reason: "Within tranche concentration threshold."
        },
        {
          id: "rule-conflict",
          name: "Holding Overlap & Secondary Market Assessment",
          status: "PASS",
          details: "No conflicting structured derivative holdings detected; client has full principal protection at maturity.",
          reason: "No conflicting instrument overlap."
        }
      ]
    }
  }
];
export const MOCK_OUTREACH = {
  id: "outreach-101",
  nba_id: "nba-101",
  channel: "PHONE",
  tone: "CONSULTATIVE",
  subject: "Upcoming Deposit Maturity & Preferential 18M Tranche \u2014 Apex Wealth",
  draft_text: `Dear Mr. Vikram Mehta,

I hope you are having a productive week.

I am reaching out regarding your \u20B91,500,000 Apex Senior Tier Fixed Deposit, which is scheduled to mature on 15-November-2026. 

To ensure continuous wealth generation without interest drag, our treasury team has opened an exclusive 18-month Fixed Deposit tranche offering a preferential rate of 7.40% p.a., representing a +30 bps yield enhancement over your current return.

Under our wealth relationship framework, this allocation preserves your capital in full while locking in an attractive guaranteed return ahead of anticipated rate revisions.

Would you be open to a brief 5-minute call tomorrow at 11:30 AM to discuss authorizing this rollover?

Warm regards,
Rajesh Kumar
Senior Relationship Manager | Apex Private Bank`,
  status: "DRAFT",
  grounding_citations: [
    "POL-SUIT-2026-V1 Section 4.2 (Term Deposit Suitability & Capital Preservation)",
    "GDL-PROD-2026-V1 Schedule B (Apex 18M Premier Deposit Rates)",
    "POL-COMM-2026-V1 Section 2.1 (Mandatory Full Disclosure of Rates & Lock-in)"
  ],
  disclaimer: "This communication is strictly confidential and intended solely for advisory consultation. Execution of transactions requires explicit client authorization.",
  created_at: "2026-11-03T09:00:00Z"
};
export const MOCK_ACTIVITIES = [
  {
    id: "act-1",
    outreach_id: "outreach-101",
    rm_id: "rm-1",
    contact_method: "CALL",
    contact_status: "CONTACT_ATTEMPTED",
    notes: "Placed call to client mobile; line was busy. Scheduled follow-up callback.",
    follow_up_date: "2026-11-04T10:00:00Z",
    created_at: "2026-11-03T10:15:00Z"
  }
];
export const MOCK_OUTCOMES = [
  {
    id: "out-1",
    nba_id: "nba-101",
    recorded_by_rm_id: "rm-1",
    action_taken: true,
    outcome: "CONVERTED",
    notes: "Client authorized rollover into 18M Fixed Deposit at 7.40%. Mandate signed via digital token.",
    follow_up_date: null,
    created_at: "2026-11-02T16:30:00Z",
    nba: MOCK_NBAS[0]
  },
  {
    id: "out-2",
    nba_id: "nba-102",
    recorded_by_rm_id: "rm-1",
    action_taken: true,
    outcome: "INTERESTED",
    notes: "Client expressed interest in Sovereign Green Bond; requested term sheet via email.",
    follow_up_date: "2026-11-06T00:00:00Z",
    created_at: "2026-11-01T14:00:00Z",
    nba: MOCK_NBAS[1]
  },
  {
    id: "out-3",
    nba_id: "nba-103",
    recorded_by_rm_id: "rm-1",
    action_taken: true,
    outcome: "FOLLOW_UP_REQUIRED",
    notes: "Client requested portfolio allocation model comparison before committing capital.",
    follow_up_date: "2026-11-08T11:00:00Z",
    created_at: "2026-10-30T10:45:00Z",
    nba: MOCK_NBAS[2]
  },
  {
    id: "out-4",
    nba_id: "nba-101",
    recorded_by_rm_id: "rm-1",
    action_taken: true,
    outcome: "NOT_INTERESTED",
    notes: "Client decided to keep funds liquid for upcoming commercial real estate acquisition.",
    follow_up_date: null,
    created_at: "2026-10-25T09:15:00Z",
    nba: {
      ...MOCK_NBAS[0],
      client: MOCK_CLIENTS[3],
      title: "3-Year Capital Protection Note"
    }
  },
  {
    id: "out-5",
    nba_id: "nba-102",
    recorded_by_rm_id: "rm-1",
    action_taken: false,
    outcome: "NO_RESPONSE",
    notes: "Multiple phone attempts and email outreach unanswered over 14-day cadence.",
    follow_up_date: null,
    created_at: "2026-10-20T15:00:00Z",
    nba: {
      ...MOCK_NBAS[1],
      client: MOCK_CLIENTS[4],
      title: "Tax-Free Infrastructure Bond Allocation"
    }
  }
];
export const MOCK_RM_STATS = {
  assignedClientsCount: 18,
  totalAum: 216e5,
  activeNbasCount: 5,
  maturingDepositsCount: 3,
  pendingFollowupsCount: 2,
  actedOnRate: 0.84,
  recentNbas: MOCK_NBAS,
  recentSignals: Object.values(MOCK_SIGNALS).flat()
};
export const MOCK_TL_STATS = {
  teamName: "North Zone Wealth Advisory",
  totalRms: 2,
  totalClients: 46,
  assignedClients: 26,
  unassignedClients: 20,
  totalRecommendations: 18,
  teamActedOnRate: 0.81,
  outcomesBreakdown: {
    CONVERTED: 14,
    INTERESTED: 11,
    FOLLOW_UP_REQUIRED: 6,
    NOT_INTERESTED: 4
  },
  rmPerformance: [
    {
      rmId: "rm-1",
      rmName: "Rajesh Kumar",
      clientsCount: 13,
      activeNbas: 5,
      actedOnRate: 0.88
    },
    {
      rmId: "rm-2",
      rmName: "Priya Verma",
      clientsCount: 13,
      activeNbas: 4,
      actedOnRate: 0.82
    }
  ]
};
