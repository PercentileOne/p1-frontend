/* ══════════════════════════════════════════════════════════════
   LearningGroups — /learning/groups
   List view → Group detail view (single-page, no sub-route)
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGroupsStore } from "../features/groups/groupsStore";
import type { Group } from "../features/groups/groupsStore";
import GroupsList        from "../features/groups/components/GroupsList";
import CreateGroupModal  from "../features/groups/components/CreateGroupModal";
import GroupHome         from "../features/groups/components/GroupHome";

export default function LearningGroups() {
  const store               = useGroupsStore();
  const [selected, setSelected]   = useState<Group | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = (opts: Parameters<typeof store.createGroup>[0]) => {
    const newGroup = store.createGroup(opts);
    setShowCreate(false);
    setSelected(newGroup);
  };

  return (
    <div className="px-5 py-5 h-full overflow-y-auto">
      <AnimatePresence mode="wait">

        {!selected ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <GroupsList
              groups={store.groups}
              onSelect={setSelected}
              onCreateClick={() => setShowCreate(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`group-${selected.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0  }}
            exit={{   opacity: 0, x: -10 }}
            transition={{ duration: 0.22 }}
            className="h-full"
          >
            <GroupHome
              group={selected}
              store={store}
              onBack={() => setSelected(null)}
            />
          </motion.div>
        )}

      </AnimatePresence>

      {showCreate && (
        <CreateGroupModal
          onConfirm={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
