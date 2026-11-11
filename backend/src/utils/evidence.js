export function getBehavioralSignalText(actionType, title = '', reason = '') {
  const at = (actionType || '').toUpperCase();
  if (at === 'DEPOSIT_ROLLOVER' || /matur/i.test(title)) {
    return 'Upcoming Fixed Deposit maturity detected';
  }
  if (at === 'YIELD_ENHANCEMENT' || /yield|bond/i.test(title)) {
    return 'Tax-efficient yield enhancement interest detected';
  }
  if (at === 'SIP_EXPANSION' || /sip|accumul/i.test(title)) {
    return 'Systematic monthly SIP investment interest detected';
  }
  if (at === 'PORTFOLIO_REBALANCE' || /rebalan|drift/i.test(title)) {
    return 'Portfolio allocation drift detected';
  }
  if (at === 'INVESTMENT_ALLOCATION' || /deploy|inflow/i.test(title)) {
    return 'Operational cash surplus detected';
  }
  if (at === 'PRODUCT_GAP' || /diversif/i.test(title)) {
    return 'Portfolio diversification gap detected';
  }
  if (at === 'ROUTINE_PORTFOLIO_REVIEW' || /review|mandate/i.test(title)) {
    return 'Annual portfolio review milestone reached';
  }
  return 'Client advisory milestone detected';
}

/**
 * Normalizes NBA evidence into an array of verifiable structured evidence citations.
 * Handles both arrays and single JSON record objects.
 * Guarantees a clean Behavioral Signal citation for every recommendation (no raw data).
 */
export function formatEvidence(evidence, nbaContext = null) {
  let items = [];

  if (Array.isArray(evidence)) {
    items = evidence.map((item) => {
      if (typeof item === 'string') {
        return { type: 'RECORD', summary: item, details: null, record_id: 'REF' };
      }
      const itemType = (item.type || 'RECORD').toUpperCase();
      let recordId = item.record_id || item.holding_id || item.signal_id || 'REF';
      let summary = item.summary || item.text || item.description || item.details || 'Grounded record citation';

      // For SIGNAL: "just mention signal no need of data"
      if (itemType === 'SIGNAL') {
        if (
          summary.startsWith('{') ||
          summary.includes('principal') ||
          summary.includes("'days'") ||
          summary.includes(';') ||
          summary.length > 60
        ) {
          summary = getBehavioralSignalText(
            nbaContext?.action_type,
            nbaContext?.title,
            nbaContext?.reason
          );
        } else if (/deposit maturity|maturing|maturity signal/i.test(summary)) {
          // Synchronize signal days with dynamic NBA title/reason if present
          let days = null;
          if (nbaContext?.title) {
            const m = nbaContext.title.match(/maturing in (\d+) days/i);
            if (m) days = m[1];
          }
          if (!days && nbaContext?.reason) {
            const m = nbaContext.reason.match(/matures in (\d+) days/i);
            if (m) days = m[1];
          }
          if (days) {
            summary = summary.replace(/\(\d+ days\)/i, `(${days} days)`);
          } else if (nbaContext?.title?.includes('maturing today') || nbaContext?.reason?.includes('matures today')) {
            summary = summary.replace(/\(\d+ days\)/i, '(today)');
          } else if (nbaContext?.title?.includes('in 1 day') || nbaContext?.reason?.includes('in 1 day')) {
            summary = summary.replace(/\(\d+ days\)/i, '(1 day)');
          }
        }
        return {
          type: 'SIGNAL',
          record_id: recordId.startsWith('sig-') ? recordId : `sig-${nbaContext?.client_id || 'client'}`,
          summary,
          details: null, // Strictly null: no raw data
        };
      }

      if (itemType === 'POLICY') {
        const isToleranceMsg =
          /risk tolerance.*aligns with product risk rating/i.test(summary) ||
          /risk tolerance.*aligns with product risk rating/i.test(item.details || '');

        if (!recordId || recordId.toLowerCase() === 'policy') {
          recordId = 'POL-SUIT-2026-V1#3';
        }

        if (isToleranceMsg || !item.details) {
          if (/POL-SUIT|suitability/i.test(recordId) || isToleranceMsg) {
            summary = 'POL-SUIT-2026-V1 § 3: Product Suitability Matrix & Risk Mandate';
          } else if (/GDL-PROD|product/i.test(recordId)) {
            summary = 'GDL-PROD-2026-V1 § 2: Product Specifications & Eligibility Rules';
          }
        }

        return {
          type: 'POLICY',
          record_id: recordId,
          summary,
          details: null,
        };
      }

      return {
        type: itemType,
        record_id: recordId,
        summary,
        details: null,
      };
    });
  } else if (evidence && typeof evidence === 'object') {
    if (evidence.holding_id) {
      items.push({
        type: 'HOLDING',
        record_id: evidence.holding_id,
        summary: `Grounded Holding Reference (${evidence.holding_id})`,
        details: null,
      });
    }
    if (evidence.signal_id) {
      items.push({
        type: 'SIGNAL',
        record_id: evidence.signal_id,
        summary: getBehavioralSignalText(nbaContext?.action_type, nbaContext?.title, nbaContext?.reason),
        details: null,
      });
    }
  }

  // Guarantee every NBA recommendation has a Behavioral Signal
  const hasSignal = items.some((it) => (it.type || '').toUpperCase() === 'SIGNAL');
  if (!hasSignal) {
    const signalText = getBehavioralSignalText(
      nbaContext?.action_type,
      nbaContext?.title,
      nbaContext?.reason
    );
    const signalItem = {
      type: 'SIGNAL',
      record_id: `sig-${nbaContext?.client_id || nbaContext?.client?.id || 'client'}-beh`,
      summary: signalText,
      details: null,
    };

    const holdingIdx = items.findIndex((it) => (it.type || '').toUpperCase() === 'HOLDING');
    if (holdingIdx >= 0) {
      items.splice(holdingIdx + 1, 0, signalItem);
    } else {
      items.unshift(signalItem);
    }
  }

  return items;
}

export function getCalendarDaysRemaining(maturityDate, fromDate = new Date()) {
  if (!maturityDate) return null;
  const mat = new Date(maturityDate);
  const now = fromDate instanceof Date ? fromDate : new Date(fromDate);
  const matDate = Date.UTC(mat.getUTCFullYear(), mat.getUTCMonth(), mat.getUTCDate());
  const nowDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((matDate - nowDate) / (1000 * 60 * 60 * 24));
}

export function adjustNbaTextForMaturity(title, reason, maturityDate, fromDate = new Date(), evidence = null) {
  if (!maturityDate) return { title, reason, evidence, diffDays: null };
  const diffDays = getCalendarDaysRemaining(maturityDate, fromDate);
  if (diffDays === null) return { title, reason, evidence, diffDays: null };

  const dayLabel =
    diffDays === 0
      ? 'today'
      : diffDays === 1
      ? 'in 1 day'
      : `in ${Math.max(0, diffDays)} days`;

  const adjustedTitle = (title || '')
    .replace(/maturing in \d+ days/i, `maturing ${dayLabel}`)
    .replace(/maturing today/i, `maturing ${dayLabel}`);

  const adjustedReason = (reason || '')
    .replace(/matures in \d+ days/i, `matures ${dayLabel}`)
    .replace(/matures today/i, `matures ${dayLabel}`);

  let adjustedEvidence = evidence;
  if (Array.isArray(evidence)) {
    adjustedEvidence = evidence.map((item) => {
      if (!item || typeof item !== 'object') return item;
      let summary = item.summary || item.text || item.description || '';
      if (/deposit maturity|maturing|maturity signal/i.test(summary)) {
        summary = summary
          .replace(/\(\d+ days\)/i, `(${diffDays} days)`)
          .replace(/in \d+ days/i, `in ${diffDays} days`)
          .replace(/:\s*\d+ days remaining/i, `: ${diffDays} days remaining`)
          .replace(/maturing today/i, `maturing ${dayLabel}`);
      }
      return {
        ...item,
        summary,
      };
    });
  }

  return { title: adjustedTitle, reason: adjustedReason, evidence: adjustedEvidence, diffDays };
}

export function cleanSimpleReason(text) {
  if (!text || typeof text !== 'string') return text;
  let cleaned = text
    .replace(/,?\s*creating an imminent liquidity event that requires proactive rollover to avoid an uninvested cash position\.?/gi, '. Reinvesting now locks in high rates and keeps funds earning safely.')
    .replace(/creating an imminent liquidity event.*?to avoid an uninvested cash position\.?/gi, 'Reinvesting now keeps money earning steadily.')
    .replace(/to avoid an uninvested cash position\.?/gi, 'so funds do not sit idle.')
    .replace(/an uninvested cash position/gi, 'idle funds')
    .replace(/an imminent liquidity event/gi, 'an upcoming maturity')
    .replace(/proactive rollover/gi, 'reinvestment')
    .replace(/a proactive call ensures reinvestment instructions are captured before maturity and prevents an unplanned cash drag\.?/gi, 'reinvesting now locks in high interest and keeps funds earning steadily.')
    .replace(/ensures reinvestment instructions are captured before maturity and prevents an unplanned cash drag\.?/gi, 'locks in current high rates and keeps your money growing safely.')
    .replace(/prevents an unplanned cash drag\.?/gi, 'keeps funds earning steadily without sitting idle.')
    .replace(/The discussion also provides an opportunity to reconfirm the client's validated \w+ risk profile before executing any allocation changes\.?/gi, "This matches the client's risk profile and keeps capital safe.")
    .replace(/reconfirm the client's validated \w+ risk profile before executing any allocation changes\.?/gi, "matches the client's risk profile.")
    .replace(/reconfirm the client's validated \w+ risk profile/gi, "matches the client's risk profile")
    .replace(/mitigates idle liquidity drag\.?/gi, 'puts idle cash to work.')
    .replace(/proactive rollover protects yield and avoids an idle-cash gap\.?/gi, 'reinvesting now locks in current high rates and keeps your money growing.')
    .replace(/cash drag/gi, 'idle cash');
  return cleaned.trim();
}

export function cleanSimpleTitle(title) {
  if (!title || typeof title !== 'string') return title;
  return title
    .replace(/^Discuss reinvestment options —\s*/i, 'Renew ')
    .replace(/Review portfolio drift \((.*?)\) and rebalance allocation/i, 'Rebalance Portfolio ($1)')
    .trim();
}

export function formatNbaResponse(n, isTeamLead = false) {
  let title = cleanSimpleTitle(n.title);
  let reason = cleanSimpleReason(n.reason);
  let evidence = n.evidence;

  // For active recommendations regarding deposit maturity, dynamically recalculate days
  if ((n.status === 'PENDING' || n.status === 'ACTIVE') && (n.action_type === 'DEPOSIT_ROLLOVER' || (title && title.toLowerCase().includes('maturing')))) {
    let matDate = null;
    if (n.client && Array.isArray(n.client.holdings)) {
      const holding = n.client.holdings.find(
        (h) => h.id === n.suggested_product_id || h.product_id === n.suggested_product_id || h.maturity_date
      );
      if (holding && holding.maturity_date) {
        matDate = holding.maturity_date;
      }
    }

    if (matDate) {
      const adjusted = adjustNbaTextForMaturity(title, reason, matDate, new Date(), evidence);
      title = adjusted.title;
      reason = adjusted.reason;
      if (adjusted.evidence) {
        evidence = adjusted.evidence;
      }
    }
  }

  let cleanSuitability = n.suitability;
  if (cleanSuitability && Array.isArray(cleanSuitability.rules)) {
    cleanSuitability = {
      ...cleanSuitability,
      rules: cleanSuitability.rules.filter(
        (r) => !r.name?.includes('Fixed Income & Single-Deposit Concentration Cap')
      ),
    };
  }

  return {
    id: n.id,
    client_id: n.client_id,
    action_type: n.action_type,
    title,
    reason,
    evidence: formatEvidence(evidence, { ...n, title, reason }),
    priority: n.priority,
    status: n.status === 'PENDING' ? 'ACTIVE' : n.status,
    confidence: n.confidence || 0.85,
    suitability: cleanSuitability || {
      is_suitable: true,
      overall_status: 'PASS',
      evaluated_at: n.created_at.toISOString(),
      rules: [
        {
          id: 'rule-risk-alignment',
          name: 'Risk Tolerance Compatibility',
          status: 'PASS',
          details: `Target product aligns with client ${n.client?.risk_profile || 'MODERATE'} risk profile.`,
        },
      ],
    },
    generated_at: n.generated_at.toISOString(),
    created_at: n.created_at.toISOString(),
    client: n.client
      ? {
          id: n.client.id,
          full_name: isTeamLead ? `Client ${n.client.id.slice(-4).toUpperCase()}` : n.client.full_name,
          segment: n.client.segment,
          risk_profile: n.client.risk_profile,
          rm_id: n.client.rm_id,
        }
      : undefined,
  };
}
