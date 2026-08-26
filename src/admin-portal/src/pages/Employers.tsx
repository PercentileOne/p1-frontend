import { UserList } from '../components/UserList'

// Backed by the "client" role slug — the Employer portal is being renamed from
// Client, and no separate "employer" role exists in the DB yet (see
// project-domain-rename-client-to-employer). Update this once that rename lands.
export default function Employers() {
  return <UserList role="client" title="Employers" searchPlaceholder="Search by name or email…" />
}
