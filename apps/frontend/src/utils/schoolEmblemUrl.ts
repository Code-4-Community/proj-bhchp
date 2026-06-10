export function schoolEmblemPublicUrl(schoolName: string): string | null {
  if (!schoolName) {
    // if no school name
    return null;
  }

  const formattedSchoolName = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // spaces/non-alphanumeric characters => underscore
    .replace(/^_+|_+$/g, ''); // trim leading/trailing underscores

  return `/assets/school-emblems/${formattedSchoolName}.png`;
}
