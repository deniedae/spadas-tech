/**
 * Canonical Single Source of Truth for Billing & Subscriptions
 */
export const BILLING_CONFIG = {
  packageId: "com.spadas.ai",
  skus: {
    weeklyTrial: "spadas_pro_weekly_trial",
    monthly: "spadas_pro_monthly",
  },
  plans: {
    weekly: {
      sku: "spadas_pro_weekly_trial",
      title: "Weekly Plan",
      trialDays: 3,
      priceFormatted: "$3.99",
      period: "weekly" as const,
      label: "3-Day Free Trial",
    },
    monthly: {
      sku: "spadas_pro_monthly",
      title: "Monthly Plan",
      trialDays: 0,
      priceFormatted: "$9.99",
      period: "monthly" as const,
      label: "Monthly Plan",
    },
  },
  freeScanAllowance: 3,
} as const;
