import type { ContractCategory } from '@/lib/contract-payroll-rules';

export type UnregisteredDefault = 'available' | 'unavailable';

export interface ShiftRegistrationCategoryRule {
  category: ContractCategory;
  registrationRequired: boolean;
  beforeDeadlineUnregistered: UnregisteredDefault;
  afterDeadlineUnregistered: UnregisteredDefault;
}

export interface ShiftRegistrationPolicy {
  deadlineDay: number;
  globalUnregisteredDefault: UnregisteredDefault;
  categoryRules: ShiftRegistrationCategoryRule[];
}

export const CONTRACT_CATEGORIES: ContractCategory[] = [
  'SEISHAIN',
  'KEIYAKU',
  'PART',
  'ARUBAITO',
  'HAKKEN',
  'CUSTOM',
];

export const DEFAULT_SHIFT_REGISTRATION_POLICY: ShiftRegistrationPolicy = {
  deadlineDay: 25,
  globalUnregisteredDefault: 'unavailable',
  categoryRules: [
    {
      category: 'SEISHAIN',
      registrationRequired: true,
      beforeDeadlineUnregistered: 'unavailable',
      afterDeadlineUnregistered: 'unavailable',
    },
    {
      category: 'KEIYAKU',
      registrationRequired: true,
      beforeDeadlineUnregistered: 'unavailable',
      afterDeadlineUnregistered: 'unavailable',
    },
    {
      category: 'PART',
      registrationRequired: true,
      beforeDeadlineUnregistered: 'available',
      afterDeadlineUnregistered: 'unavailable',
    },
    {
      category: 'ARUBAITO',
      registrationRequired: true,
      beforeDeadlineUnregistered: 'available',
      afterDeadlineUnregistered: 'unavailable',
    },
    {
      category: 'HAKKEN',
      registrationRequired: true,
      beforeDeadlineUnregistered: 'available',
      afterDeadlineUnregistered: 'unavailable',
    },
    {
      category: 'CUSTOM',
      registrationRequired: true,
      beforeDeadlineUnregistered: 'unavailable',
      afterDeadlineUnregistered: 'unavailable',
    },
  ],
};

function normalizeCategory(value?: string | null): ContractCategory {
  const v = (value || 'CUSTOM').toUpperCase();
  if (CONTRACT_CATEGORIES.includes(v as ContractCategory)) return v as ContractCategory;
  return 'CUSTOM';
}

function normalizeUnregisteredDefault(value?: string | null): UnregisteredDefault {
  return value === 'available' ? 'available' : 'unavailable';
}

export function parseShiftRegistrationPolicy(
  raw?: unknown,
  deadlineDayFallback = 25
): ShiftRegistrationPolicy {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SHIFT_REGISTRATION_POLICY,
      deadlineDay: Math.min(31, Math.max(1, deadlineDayFallback)),
    };
  }
  const obj = raw as Record<string, unknown>;
  const deadlineDay = Math.min(
    31,
    Math.max(1, Number(obj.deadlineDay ?? deadlineDayFallback) || deadlineDayFallback)
  );
  const globalUnregisteredDefault = normalizeUnregisteredDefault(
    obj.globalUnregisteredDefault as string | undefined
  );

  const rulesRaw = Array.isArray(obj.categoryRules) ? obj.categoryRules : [];
  const categoryRules: ShiftRegistrationCategoryRule[] = CONTRACT_CATEGORIES.map(cat => {
    const found = rulesRaw.find(
      r => r && typeof r === 'object' && normalizeCategory((r as { category?: string }).category) === cat
    ) as Partial<ShiftRegistrationCategoryRule> | undefined;
    const fallback = DEFAULT_SHIFT_REGISTRATION_POLICY.categoryRules.find(r => r.category === cat)!;
    return {
      category: cat,
      registrationRequired: found?.registrationRequired ?? fallback.registrationRequired,
      beforeDeadlineUnregistered: normalizeUnregisteredDefault(
        found?.beforeDeadlineUnregistered ?? fallback.beforeDeadlineUnregistered
      ),
      afterDeadlineUnregistered: normalizeUnregisteredDefault(
        found?.afterDeadlineUnregistered ?? fallback.afterDeadlineUnregistered
      ),
    };
  });

  return { deadlineDay, globalUnregisteredDefault, categoryRules };
}

/** Month before target shift month (employees register in M-1 for month M). */
export function getRegistrationWindowMonth(targetDate: string): string {
  const [y, m] = targetDate.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getRegistrationDeadlineDate(targetDate: string, deadlineDay: number): string {
  const windowMonth = getRegistrationWindowMonth(targetDate);
  const [y, m] = windowMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(Math.max(deadlineDay, 1), lastDay);
  return `${windowMonth}-${String(day).padStart(2, '0')}`;
}

export function isPastRegistrationDeadline(
  targetDate: string,
  deadlineDay: number,
  todayStr: string
): boolean {
  const deadline = getRegistrationDeadlineDate(targetDate, deadlineDay);
  return todayStr > deadline;
}

export function getCategoryRule(
  policy: ShiftRegistrationPolicy,
  contractCategory?: string | null
): ShiftRegistrationCategoryRule {
  const cat = normalizeCategory(contractCategory);
  return (
    policy.categoryRules.find(r => r.category === cat) ||
    policy.categoryRules.find(r => r.category === 'CUSTOM')!
  );
}

export type WorkEligibilitySource = 'registered' | 'policy_default' | 'optional_mode';

export interface WorkEligibilityResult {
  eligible: boolean;
  preference: string;
  source: WorkEligibilitySource;
  reason?: string;
}

export function resolveEmployeeWorkEligibility(params: {
  shiftRegistrationRequired: boolean;
  policy: ShiftRegistrationPolicy;
  contractCategory?: string | null;
  assignDate: string;
  registrationPreference?: string | null;
  todayStr: string;
  /** HR/admin assigning shifts: bypass deadline & category rules */
  adminOverride?: boolean;
}): WorkEligibilityResult {
  const {
    shiftRegistrationRequired,
    policy,
    contractCategory,
    assignDate,
    registrationPreference,
    todayStr,
    adminOverride = false,
  } = params;

  const pref = (registrationPreference || '').toLowerCase();

  if (adminOverride) {
    return {
      eligible: true,
      preference: pref && pref !== 'off' ? pref : pref === 'off' ? 'off' : 'any',
      source: pref ? 'registered' : 'optional_mode',
      reason: 'admin_override',
    };
  }

  if (!shiftRegistrationRequired) {
    if (pref === 'off') {
      return { eligible: false, preference: 'off', source: 'registered', reason: 'registered_off' };
    }
    return {
      eligible: true,
      preference: pref && pref !== 'off' ? pref : 'any',
      source: 'optional_mode',
    };
  }

  if (pref === 'off') {
    return { eligible: false, preference: 'off', source: 'registered', reason: 'registered_off' };
  }

  if (pref && pref !== 'off') {
    return { eligible: true, preference: pref, source: 'registered' };
  }

  const rule = getCategoryRule(policy, contractCategory);

  if (!rule.registrationRequired) {
    return { eligible: true, preference: 'any', source: 'policy_default', reason: 'category_optional' };
  }

  const pastDeadline = isPastRegistrationDeadline(assignDate, policy.deadlineDay, todayStr);
  const unregisteredDefault = pastDeadline
    ? rule.afterDeadlineUnregistered
    : rule.beforeDeadlineUnregistered;

  const effective =
    unregisteredDefault === 'available' ? 'available' : policy.globalUnregisteredDefault;

  if (effective === 'available') {
    return {
      eligible: true,
      preference: 'any',
      source: 'policy_default',
      reason: pastDeadline ? 'after_deadline_available' : 'before_deadline_available',
    };
  }

  return {
    eligible: false,
    preference: 'off',
    source: 'policy_default',
    reason: pastDeadline ? 'after_deadline_unavailable' : 'before_deadline_unavailable',
  };
}