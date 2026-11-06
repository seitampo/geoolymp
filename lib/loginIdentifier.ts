// These aliases belong to the teacher workspace provisioned for this import.
export function normalizeLoginIdentifier(value: string) {
  const identifier = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    aliya: "aliya.maksutovna.20261106@geoolymp.invalid",
    oqyshy: "oqyshy.aliya.20261106@geoolymp.invalid",
  };
  return aliases[identifier] ?? identifier;
}
