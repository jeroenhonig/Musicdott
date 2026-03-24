/**
 * AVG Art. 5(1)(e) — Storage limitation / data retention
 *
 * Anonymizes personal data for accounts that have been inactive for longer than
 * DATA_RETENTION_YEARS (default: 3 years). Platform-owner accounts are exempt.
 *
 * Anonymization replaces identifying fields with placeholders while keeping the
 * user record to preserve referential integrity (lessons, assignments, etc.).
 */

import { db } from '../db';
import { users } from '@shared/schema';
import { lt, and, ne, eq } from 'drizzle-orm';

const RETENTION_YEARS = parseInt(process.env.DATA_RETENTION_YEARS ?? '3', 10);

function cutoffDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - RETENTION_YEARS);
  return d;
}

export async function runDataRetentionCleanup(): Promise<{ anonymized: number }> {
  const cutoff = cutoffDate();

  // Find accounts that haven't logged in since the cutoff date.
  // Accounts that never logged in (lastLoginAt IS NULL) are skipped — we have no
  // creation date on this table to reliably judge their age.
  const staleUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        ne(users.role, 'platform_owner'), // Never anonymize platform owners
        lt(users.lastLoginAt, cutoff),
      ),
    );

  if (staleUsers.length === 0) {
    return { anonymized: 0 };
  }

  let anonymized = 0;
  for (const { id } of staleUsers) {
    await db
      .update(users)
      .set({
        name: `Deleted User ${id}`,
        email: `deleted-${id}@anonymized.local`,
        bio: null,
        instruments: null,
      })
      .where(eq(users.id, id));

    anonymized++;
  }

  console.log(`[data-retention] Anonymized ${anonymized} inactive account(s) (cutoff: ${cutoff.toISOString()})`);
  return { anonymized };
}
