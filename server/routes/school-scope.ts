export function getAccessibleSchoolIds(req: any): number[] {
  if (!req.school || req.school.isPlatformOwner()) {
    return [];
  }

  const schoolIds = new Set<number>();
  const primarySchoolId = req.school.id || req.user?.schoolId;
  if (typeof primarySchoolId === "number" && primarySchoolId > 0) {
    schoolIds.add(primarySchoolId);
  }

  for (const membership of req.school.memberships || []) {
    if (typeof membership.schoolId === "number" && membership.schoolId > 0) {
      schoolIds.add(membership.schoolId);
    }
  }

  return Array.from(schoolIds);
}

export function canAccessSchoolId(req: any, schoolId: number | null | undefined): boolean {
  if (req.school?.isPlatformOwner()) {
    return true;
  }

  return typeof schoolId === "number" && schoolId > 0 && Boolean(req.school?.canAccessSchool(schoolId));
}
