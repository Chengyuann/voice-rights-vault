export type PolicyDecision = 'allow' | 'reject' | 'block'

export type PolicyAssessment = {
  decision: PolicyDecision
  purpose: 'GAME_NPC' | 'POLITICAL' | 'FINANCIAL IMPERSONATION' | 'ADVERTISING' | 'CUSTOMER SUPPORT' | 'NEWS' | 'HEALTHCARE'
  purposeCode: string
  confidence: string
  risks: string[]
  explanation: string
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

export function classifyPrompt(prompt: string): PolicyAssessment {
  const normalized = prompt.toLowerCase().replace(/\s+/g, ' ').trim()
  const politicalTopic = includesAny(normalized, ['vote', 'candidate', 'election', 'campaign', 'political party', 'ballot', 'elect '])
  const politicalAction = includesAny(normalized, ['vote for', 'support ', 'elect ', 'donate', 'join the campaign', 'persuade'])
  const financialIdentity = includesAny(normalized, ['bank', 'account', 'wire transfer', 'verification code', 'password', 'one-time code', 'otp'])
  const financialAction = includesAny(normalized, ['read the', 'share the', 'send the', 'restore', 'unlock', 'confirm', 'transfer', 'log in'])

  if (financialIdentity && financialAction) {
    return {
      decision: 'block',
      purpose: 'FINANCIAL IMPERSONATION',
      purposeCode: 'RISK / 02',
      confidence: '98%',
      risks: ['FINANCIAL_IMPERSONATION'],
      explanation: 'Blocked: the request combines a trusted financial identity with credential or account action.',
    }
  }
  if (politicalTopic && politicalAction) {
    return {
      decision: 'block',
      purpose: 'POLITICAL',
      purposeCode: 'RISK / 01',
      confidence: '97%',
      risks: ['POLITICAL_PERSUASION'],
      explanation: 'Blocked: political persuasion is outside the GAME_NPC license.',
    }
  }
  if (includesAny(normalized, ['buy now', 'limited offer', 'promotion', 'advertisement', 'sponsored', 'subscribe today', 'discount code', 'checkout'])) {
    return {
      decision: 'reject',
      purpose: 'ADVERTISING',
      purposeCode: 'PURPOSE / 04',
      confidence: '94%',
      risks: [],
      explanation: 'Rejected: advertising is not included in this license scope.',
    }
  }
  if (includesAny(normalized, ['customer support', 'support ticket', 'refund request', 'order number', 'help desk', 'service representative'])) {
    return {
      decision: 'reject',
      purpose: 'CUSTOMER SUPPORT',
      purposeCode: 'PURPOSE / 05',
      confidence: '92%',
      risks: [],
      explanation: 'Rejected: customer support is a separate licensed purpose.',
    }
  }
  if (includesAny(normalized, ['breaking news', 'news bulletin', 'news report', 'live from the newsroom'])) {
    return {
      decision: 'reject',
      purpose: 'NEWS',
      purposeCode: 'PURPOSE / 06',
      confidence: '91%',
      risks: [],
      explanation: 'Rejected: news narration is outside the GAME_NPC license.',
    }
  }
  if (includesAny(normalized, ['medical advice', 'your doctor', 'prescription', 'diagnosis', 'treatment plan'])) {
    return {
      decision: 'reject',
      purpose: 'HEALTHCARE',
      purposeCode: 'PURPOSE / 07',
      confidence: '93%',
      risks: [],
      explanation: 'Rejected: healthcare use requires a separately reviewed license.',
    }
  }
  return {
    decision: 'allow',
    purpose: 'GAME_NPC',
    purposeCode: 'PURPOSE / 01',
    confidence: '96%',
    risks: [],
    explanation: 'Allowed: narrative NPC dialogue matches the private license policy.',
  }
}
