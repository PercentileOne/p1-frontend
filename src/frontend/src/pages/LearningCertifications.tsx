/* ══════════════════════════════════════════════════════════════
   LearningCertifications — list ↔ detail slide navigation
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCertificationsStore } from "../features/certifications/certificationsStore";
import type { Certification } from "../features/certifications/certificationsStore";
import CertificationsList  from "../features/certifications/components/CertificationsList";
import CertificationDetail from "../features/certifications/components/CertificationDetail";

type View = "list" | "detail";

export default function LearningCertifications() {
  const store    = useCertificationsStore();
  const [view,   setView]   = useState<View>("list");
  const [selected, setSelected] = useState<Certification | null>(null);

  const openDetail = (cert: Certification) => {
    setSelected(cert);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setTimeout(() => setSelected(null), 300);
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x:   0 }}
            exit={{   opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <CertificationsList
              certifications={store.certifications}
              onSelect={openDetail}
              onAdd={() => {
                // Phase 8: custom cert creation modal
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 32  }}
            animate={{ opacity: 1, x:  0  }}
            exit={{   opacity: 0, x: 32  }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {selected && (
              <CertificationDetail
                cert={selected}
                onBack={goBack}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
