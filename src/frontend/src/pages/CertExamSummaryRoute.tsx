import { useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { RequirePermission } from '../auth/RequirePermission';
import CertExamSummaryPage from './CertExamSummaryPage';
import SharedCertExamPage from './SharedCertExamPage';

// /cert-exam-summary/:id used to be login-gated for everyone, but it is also the address people were
// given as a "share link" — so a shared result could never be opened by anyone without an account
// (Francis, 2026-09-19). Now: a signed-out visitor, or someone arriving with no exam just finished in
// this browser, gets the PUBLIC read-only view (which only returns results the owner chose to share);
// a signed-in candidate finishing or revisiting their own exam gets their own summary page. If a
// signed-in visitor turns out not to own the result, CertExamSummaryPage itself falls back to the
// public view.
export default function CertExamSummaryRoute() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const token = useAuthStore(s => s.token);
  const justFinished = !!(location.state as { certName?: string } | null)?.certName;

  if (!token && !justFinished) return <SharedCertExamPage id={id} />;
  return (
    <RequirePermission permission="CAN_START_INTERVIEW">
      <CertExamSummaryPage />
    </RequirePermission>
  );
}
