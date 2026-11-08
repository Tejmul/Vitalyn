/** The only user fields ever sent to the client. */
export function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    hospitalId: u.hospitalId,
    consentAt: u.consentAt,
    createdAt: u.createdAt,
  };
}
