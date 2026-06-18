import { useNavigate } from "react-router-dom";
import React, { useState } from "react";

type CareerSelectFormProps = {
  setInsight: (msg: string) => void;
  setImageUrl: (url: string) => void;
  setLifestyle: (msg: string) => void;
  showLifestyle: boolean;
  setShowLifestyle: (value: boolean) => void;
};

type RoleOption = {
  id: string;
  name: string;
};

type SubdomainOption = {
  id: string;
  name: string;
  roles: RoleOption[];
};

type DomainOption = {
  id: string;
  name: string;
  imageUrl: string;
  insight: string;
  lifestyle: string;
  subdomains: SubdomainOption[];
};

const DOMAINS: DomainOption[] = [
  {
    id: "sports",
    name: "Sports",
    imageUrl:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
    insight: "A world built on discipline, resilience, and precision.",
    lifestyle:
      "Early mornings, structured training blocks, recovery rituals, and a life built around competition and marginal gains.",
    subdomains: [
      {
        id: "football",
        name: "Football",
        roles: [
          { id: "striker", name: "Striker" },
          { id: "midfielder", name: "Midfielder" },
          { id: "goalkeeper", name: "Goalkeeper" },
        ],
      },
      {
        id: "basketball",
        name: "Basketball",
        roles: [
          { id: "guard", name: "Guard" },
          { id: "forward", name: "Forward" },
          { id: "center", name: "Center" },
        ],
      },
    ],
  },
  {
    id: "it",
    name: "IT & Software",
    imageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    insight: "A craft of logic, creativity, and constant evolution.",
    lifestyle:
      "Deep work sessions, constant learning, shipping features, debugging late, and building systems that outlive you.",
    subdomains: [
      {
        id: "software-dev",
        name: "Software Development",
        roles: [
          { id: "frontend", name: "Frontend Engineer" },
          { id: "backend", name: "Backend Engineer" },
          { id: "fullstack", name: "Full‑stack Engineer" },
        ],
      },
      {
        id: "data",
        name: "Data & AI",
        roles: [
          { id: "datasci", name: "Data Scientist" },
          { id: "mleng", name: "ML Engineer" },
        ],
      },
    ],
  },
  {
    id: "medicine",
    name: "Medicine & Healthcare",
    imageUrl:
      "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=1200&q=80",
    insight: "A path of service, mastery, and lifelong learning.",
    lifestyle:
      "Long shifts, high stakes, constant study, and the responsibility of holding other people’s lives in your hands.",
    subdomains: [
      {
        id: "doctor",
        name: "Doctor",
        roles: [
          { id: "surgeon", name: "Surgeon" },
          { id: "gp", name: "General Practitioner" },
        ],
      },
      {
        id: "nursing",
        name: "Nursing",
        roles: [
          { id: "rn", name: "Registered Nurse" },
          { id: "specialist-nurse", name: "Specialist Nurse" },
        ],
      },
    ],
  },
  {
    id: "business",
    name: "Business & Entrepreneurship",
    imageUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    insight: "Owning risk, creating value, and building from zero.",
    lifestyle:
      "Uncertain income, long hours, high responsibility, and the upside of building something that didn’t exist before.",
    subdomains: [
      {
        id: "startup",
        name: "Startups",
        roles: [
          { id: "founder", name: "Founder / CEO" },
          { id: "product-lead", name: "Product Lead" },
        ],
      },
      {
        id: "corporate",
        name: "Corporate",
        roles: [
          { id: "manager", name: "Manager" },
          { id: "consultant", name: "Consultant" },
        ],
      },
    ],
  },
  {
    id: "creative",
    name: "Creative Arts",
    imageUrl:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80",
    insight: "Turning imagination into work that moves people.",
    lifestyle:
      "Irregular hours, deep focus, experimentation, and the constant tension between vision, craft, and deadlines.",
    subdomains: [
      {
        id: "writing",
        name: "Writing",
        roles: [
          { id: "author", name: "Author" },
          { id: "screenwriter", name: "Screenwriter" },
        ],
      },
      {
        id: "design",
        name: "Design",
        roles: [
          { id: "ux", name: "UX Designer" },
          { id: "visual", name: "Visual Designer" },
        ],
      },
    ],
  },
];

export default function CareerSelectForm({
  setInsight,
  setImageUrl,
  setLifestyle,
  showLifestyle,
  setShowLifestyle,
}: CareerSelectFormProps) {
  const navigate = useNavigate();
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [selectedSubdomainId, setSelectedSubdomainId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const selectedDomain = DOMAINS.find((d) => d.id === selectedDomainId);
  const selectedSubdomain = selectedDomain?.subdomains.find(
    (s) => s.id === selectedSubdomainId,
  );
  const selectedRole = selectedSubdomain?.roles.find(
    (r) => r.id === selectedRoleId,
  );

  const hideLifestyleIfOpen = () => {
    if (showLifestyle) setShowLifestyle(false);
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedDomainId(value);
    setSelectedSubdomainId("");
    setSelectedRoleId("");
    hideLifestyleIfOpen();

    const domain = DOMAINS.find((d) => d.id === value);
    if (domain) {
      setImageUrl(domain.imageUrl);
      setLifestyle(domain.lifestyle);
      setInsight(domain.insight);
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSubdomainId(value);
    setSelectedRoleId("");
    hideLifestyleIfOpen();

    if (selectedDomain && value) {
      const sub = selectedDomain.subdomains.find((s) => s.id === value);
      if (sub) {
        setInsight(
          `${selectedDomain.name} → ${sub.name}. You’re narrowing your craft.`,
        );
      }
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedRoleId(value);
    hideLifestyleIfOpen();

    if (selectedDomain && selectedSubdomain && value) {
      const roleName =
        selectedSubdomain.roles.find((r) => r.id === value)?.name ??
        "this role";
      setInsight(
        `${roleName}. Now we can start shaping a path that matches the reality of this world.`,
      );
    }
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain || !selectedSubdomain || !selectedRole) {
      setInsight("Choose your domain, discipline, and role to continue.");
      return;
    }

    setInsight(
      `Locking in: ${selectedDomain.name} → ${selectedSubdomain.name} → ${selectedRole.name}. This is the identity we’ll build around.`,
    );

    navigate("/percentile");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        Where do you want to reach the top?
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Choose the world you want to master. We’ll shape everything around this.
      </p>

      <form className="space-y-4" onSubmit={handleContinue}>
        <div>
          <label className="block text-sm font-medium mb-1">
            Domain (the world you belong to)
          </label>
          <select
            value={selectedDomainId}
            onChange={handleDomainChange}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select a domain...</option>
            {DOMAINS.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Discipline (your lane inside that world)
          </label>
          <select
            value={selectedSubdomainId}
            onChange={handleSubdomainChange}
            disabled={!selectedDomain}
            className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">
              {selectedDomain
                ? "Select a discipline..."
                : "Choose a domain first..."}
            </option>
            {selectedDomain?.subdomains.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Role (the position you want to master)
          </label>
          <select
            value={selectedRoleId}
            onChange={handleRoleChange}
            disabled={!selectedSubdomain}
            className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">
              {selectedSubdomain
                ? "Select a role..."
                : "Choose a discipline first..."}
            </option>
            {selectedSubdomain?.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold mt-4"
        >
          Continue
        </button>

        <button
          onClick={() => navigate("/explorer")}
          style={{
            marginTop: "20px",
            padding: "12px 20px",
            background: "#4A90E2",
            color: "white",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Open Career Explorer
        </button>
      </form>
    </div>
  );
}
