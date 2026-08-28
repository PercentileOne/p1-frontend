import { UserList } from '../components/UserList'

export default function Candidates() {
  return <UserList role="candidate" title="Candidates" entityLabel="Candidate" searchPlaceholder="Search by name or email…" />
}
