import { Teacher, PiketAccount, DayOfWeek } from '../types';

/**
 * Common Indonesian academic titles & honorifics to strip when generating usernames
 */
const TITLES_REGEX = /\b(drs|dra|dr|prof|ir|h|hj|s\.pd\.i|s\.pd|m\.pd|s\.ag|m\.ag|s\.kom|m\.kom|s\.si|m\.si|s\.t|m\.t|s\.sos|m\.m|s\.e|m\.e|s\.psi|m\.psi|a\.md|gr)\b\.?/gi;

/**
 * Generates a clean, lowercase username derived from teacher's name
 * e.g. "Riza Fani, S.Pd., M.Pd." -> "rizafani"
 * e.g. "Drs. Muhammad Nasir" -> "muhammadnasir"
 */
export function cleanTeacherNameForUsername(fullName: string): string {
  if (!fullName) return 'guru';

  // 1. Remove title segments after comma or common academic abbreviations
  let cleaned = fullName
    .replace(TITLES_REGEX, '')
    .replace(/[,.]+/g, ' ')
    .trim();

  // 2. Remove anything that isn't alphanumeric or space
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '');

  // 3. Convert multiple spaces to single, then lowercase
  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 'piket_' + Math.random().toString(36).substring(2, 6);
  }

  // Join words directly for a smooth username e.g. "rizafani", "aniskurli"
  let username = words.join('');

  // Keep reasonable length
  if (username.length > 20) {
    username = username.slice(0, 20);
  }

  return username;
}

/**
 * Generates an automatic, memorable default password
 * Uses "piket" + last 4 digits of NIP (or "2025" if NIP not numeric)
 * e.g. NIP 198005122005011005 -> "piket1005"
 */
export function generateDefaultPiketPassword(nip?: string, name?: string): string {
  if (nip) {
    const digits = nip.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `piket${digits.slice(-4)}`;
    }
  }

  if (name) {
    const clean = cleanTeacherNameForUsername(name);
    return `piket${clean.slice(0, 4)}123`;
  }

  return 'piket2025';
}

/**
 * Synchronizes teachers list with piket accounts
 * Ensures every teacher has an account while preserving custom passwords/usernames created by Admin
 */
export function syncPiketAccountsWithTeachers(
  teachers: Teacher[],
  existingAccounts: PiketAccount[] = []
): PiketAccount[] {
  const accountMap = new Map<string, PiketAccount>();

  existingAccounts.forEach((acc) => {
    accountMap.set(acc.teacherId, acc);
  });

  const usedUsernames = new Set<string>();

  return teachers.map((teacher) => {
    const existing = accountMap.get(teacher.id);

    if (existing) {
      // Preserve existing account data, but update teacher name/nip if changed
      let un = existing.username || cleanTeacherNameForUsername(teacher.name);
      if (usedUsernames.has(un)) {
        un = `${un}${teacher.nip ? teacher.nip.slice(-2) : '1'}`;
      }
      usedUsernames.add(un);

      return {
        ...existing,
        teacherName: teacher.name,
        nip: teacher.nip,
        username: un,
        password: existing.password || generateDefaultPiketPassword(teacher.nip, teacher.name),
        isActive: existing.isActive !== undefined ? existing.isActive : teacher.status === 'Aktif',
      };
    }

    // Generate new account
    let baseUsername = cleanTeacherNameForUsername(teacher.name);
    if (usedUsernames.has(baseUsername)) {
      const suffix = teacher.nip && teacher.nip.length >= 2 ? teacher.nip.slice(-2) : '2';
      baseUsername = `${baseUsername}${suffix}`;
    }
    usedUsernames.add(baseUsername);

    const newAccount: PiketAccount = {
      id: `piket-${teacher.id}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      nip: teacher.nip,
      username: baseUsername,
      password: generateDefaultPiketPassword(teacher.nip, teacher.name),
      assignedDays: ['Senin'], // default 1 day or empty
      isActive: teacher.status === 'Aktif',
      updatedAt: new Date().toISOString(),
    };

    return newAccount;
  });
}

/**
 * Formats a clean list of piket credentials for WhatsApp / print
 */
export function formatPiketAccountsForSharing(accounts: PiketAccount[]): string {
  const header = `*DAFTAR AKUN LOGIN PIKET GURU SMAN 1 JULOK*\n_Portal Presensi & Petugas Piket_\n----------------------------------------\n`;
  const body = accounts
    .filter((a) => a.isActive)
    .map(
      (a, i) =>
        `${i + 1}. *${a.teacherName}*\n` +
        `   • NIP: ${a.nip || '-'}\n` +
        `   • Username: \`${a.username}\`\n` +
        `   • Password: \`${a.password}\`\n` +
        `   • Jadwal Piket: ${a.assignedDays && a.assignedDays.length > 0 ? a.assignedDays.join(', ') : 'Belum diatur'}\n`
    )
    .join('\n');

  const footer = `\n----------------------------------------\n_Catatan: Gunakan menu login "Guru Piket" untuk mencatat kehadiran guru berhalangan._`;
  return header + body + footer;
}
