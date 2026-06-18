import type { Career } from "../../../data/models/Career";

type Props = {
  roles: Career[];
};

export const SubcategoryTopRolesSection = ({ roles }: Props) => {
  if (!roles.length) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ color: "#fff", marginBottom: 12 }}>
        Top roles in this world
      </h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {roles.map((role) => (
          <div
            key={role.id}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontSize: 14,
            }}
          >
            {role.name}
          </div>
        ))}
      </div>
    </section>
  );
};
