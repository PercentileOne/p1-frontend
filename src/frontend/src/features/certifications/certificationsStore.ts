/* ══════════════════════════════════════════════════════════════
   CERTIFICATIONS STORE — Phase 7
   Module-level singleton. Mock-only until Phase 9 backend.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export type ChapterSourceType = "book" | "note" | "card";

export interface ChapterRef {
  id:           string;
  sourceType:   ChapterSourceType;
  sourceId:     string;           // bookId / noteId / cardId
  chapterId?:   string;           // bookId's chapter.id (books only)
  title:        string;
  description?: string;
}

export interface SyllabusSection {
  id:       string;
  title:    string;
  chapters: ChapterRef[];
}

export interface Certification {
  id:          string;
  title:       string;
  provider:    string;
  description: string;
  cover:       string | null;
  syllabus:    SyllabusSection[];
  createdAt:   Date;
}

// ── Mock seed data ──────────────────────────────────────────────────

const SEED: Certification[] = [
  {
    id:          "cert-aws-saa",
    title:       "AWS Solutions Architect",
    provider:    "Amazon Web Services",
    description: "Validates the ability to design and deploy scalable, highly available, and fault-tolerant systems on AWS.",
    cover:       "linear-gradient(135deg, #FF9900 0%, #c97400 100%)",
    createdAt:   new Date("2025-10-01"),
    syllabus: [
      {
        id:    "aws-s1",
        title: "Cloud Foundations",
        chapters: [
          { id: "aws-s1-c1", sourceType: "card", sourceId: "card-react-hooks",      title: "IAM & Security Basics",      description: "Users, groups, roles, policies and best practices" },
          { id: "aws-s1-c2", sourceType: "card", sourceId: "card-typescript",        title: "AWS Global Infrastructure",  description: "Regions, AZs, edge locations and latency zones" },
          { id: "aws-s1-c3", sourceType: "card", sourceId: "card-tailwind-v4",       title: "Core Services Overview",     description: "EC2, S3, RDS, Lambda, VPC fundamentals" },
        ],
      },
      {
        id:    "aws-s2",
        title: "Compute & Networking",
        chapters: [
          { id: "aws-s2-c1", sourceType: "book", sourceId: "book-pragmatic",         chapterId: "pp-ch1", title: "EC2 Instance Types & Pricing",    description: "On-demand, reserved, spot — when to use each" },
          { id: "aws-s2-c2", sourceType: "book", sourceId: "book-pragmatic",         chapterId: "pp-ch2", title: "VPC Design Patterns",              description: "Subnets, route tables, NAT, security groups" },
          { id: "aws-s2-c3", sourceType: "card", sourceId: "card-vite-build",        title: "Load Balancing & Auto Scaling",  description: "ALB, NLB, target groups, scaling policies" },
        ],
      },
      {
        id:    "aws-s3",
        title: "Storage & Databases",
        chapters: [
          { id: "aws-s3-c1", sourceType: "note", sourceId: "note-react-hooks",       title: "S3 Storage Classes & Lifecycle",  description: "Standard, IA, Glacier — cost vs access trade-offs" },
          { id: "aws-s3-c2", sourceType: "note", sourceId: "note-framer-motion",     title: "RDS Multi-AZ & Read Replicas",    description: "High availability vs read scaling" },
          { id: "aws-s3-c3", sourceType: "card", sourceId: "card-framer-motion",     title: "DynamoDB & NoSQL Patterns",       description: "Partition keys, GSIs, eventual consistency" },
        ],
      },
      {
        id:    "aws-s4",
        title: "High Availability & DR",
        chapters: [
          { id: "aws-s4-c1", sourceType: "book", sourceId: "book-clean-code",        chapterId: "cc-ch1", title: "Multi-Region Architectures",  description: "Active-active vs active-passive failover" },
          { id: "aws-s4-c2", sourceType: "card", sourceId: "card-react-hooks",       title: "RTO & RPO Strategy",             description: "Backup, pilot light, warm standby, hot standby" },
          { id: "aws-s4-c3", sourceType: "note", sourceId: "note-typescript-lecture", title: "Route 53 & DNS Failover",        description: "Routing policies and health checks" },
        ],
      },
    ],
  },

  {
    id:          "cert-cfa-l1",
    title:       "CFA Level 1",
    provider:    "CFA Institute",
    description: "Foundational knowledge of investment tools, portfolio management, and ethical standards for the investment profession.",
    cover:       "linear-gradient(135deg, #1a3a5c 0%, #0d2035 100%)",
    createdAt:   new Date("2025-11-15"),
    syllabus: [
      {
        id:    "cfa-s1",
        title: "Ethical & Professional Standards",
        chapters: [
          { id: "cfa-s1-c1", sourceType: "card", sourceId: "card-typescript",    title: "CFA Institute Code of Ethics",  description: "The six components and why they matter in practice" },
          { id: "cfa-s1-c2", sourceType: "card", sourceId: "card-tailwind-v4",   title: "Standards of Professional Conduct", description: "Professionalism, integrity, duties to clients" },
        ],
      },
      {
        id:    "cfa-s2",
        title: "Quantitative Methods",
        chapters: [
          { id: "cfa-s2-c1", sourceType: "note", sourceId: "note-react-hooks",   title: "Time Value of Money",           description: "PV, FV, annuities, perpetuities, effective rates" },
          { id: "cfa-s2-c2", sourceType: "note", sourceId: "note-vite-pdf",      title: "Statistical Concepts",          description: "Distributions, hypothesis testing, regression basics" },
          { id: "cfa-s2-c3", sourceType: "card", sourceId: "card-react-hooks",   title: "Probability & Expected Value",  description: "Bayes' theorem, conditional probability, covariance" },
        ],
      },
      {
        id:    "cfa-s3",
        title: "Economics",
        chapters: [
          { id: "cfa-s3-c1", sourceType: "book", sourceId: "book-ydkjs",         chapterId: "ydkjs-ch1", title: "Microeconomics Foundations",   description: "Supply/demand, elasticity, firm theory, market structures" },
          { id: "cfa-s3-c2", sourceType: "book", sourceId: "book-ydkjs",         chapterId: "ydkjs-ch2", title: "Macroeconomics & Policy",       description: "GDP, inflation, monetary & fiscal policy cycles" },
        ],
      },
      {
        id:    "cfa-s4",
        title: "Fixed Income & Equity",
        chapters: [
          { id: "cfa-s4-c1", sourceType: "card", sourceId: "card-vite-build",    title: "Bond Valuation & Yield Measures", description: "Duration, convexity, yield to maturity, spread analysis" },
          { id: "cfa-s4-c2", sourceType: "card", sourceId: "card-framer-motion", title: "Equity Valuation Models",         description: "DDM, free cash flow, EV multiples, relative valuation" },
          { id: "cfa-s4-c3", sourceType: "note", sourceId: "note-react-patterns", title: "Portfolio Risk & Return",         description: "Mean-variance optimisation, CAPM, beta, Sharpe ratio" },
        ],
      },
    ],
  },

  {
    id:          "cert-anatomy",
    title:       "Medical Anatomy Basics",
    provider:    "P1 Medical Track",
    description: "Core anatomical structures, systems, and clinical correlations — the knowledge base for any medical or health science career.",
    cover:       "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)",
    createdAt:   new Date("2025-12-01"),
    syllabus: [
      {
        id:    "anat-s1",
        title: "Musculoskeletal System",
        chapters: [
          { id: "anat-s1-c1", sourceType: "card", sourceId: "card-react-hooks",   title: "Bone Classification & Structure", description: "Long, short, flat, irregular — histology and function" },
          { id: "anat-s1-c2", sourceType: "card", sourceId: "card-typescript",    title: "Major Joints & Range of Motion",  description: "Hinge, ball-and-socket, pivot joints and clinical relevance" },
          { id: "anat-s1-c3", sourceType: "card", sourceId: "card-tailwind-v4",   title: "Muscle Groups & Actions",          description: "Origin, insertion, innervation, and action of major muscles" },
        ],
      },
      {
        id:    "anat-s2",
        title: "Cardiovascular & Respiratory",
        chapters: [
          { id: "anat-s2-c1", sourceType: "note", sourceId: "note-react-hooks",   title: "Heart Anatomy & Conduction",    description: "Chambers, valves, SA/AV nodes, bundle of His, Purkinje fibres" },
          { id: "anat-s2-c2", sourceType: "note", sourceId: "note-framer-motion", title: "Pulmonary Circulation",          description: "Right heart to lungs — gas exchange at the alveolar level" },
          { id: "anat-s2-c3", sourceType: "book", sourceId: "book-clean-code",    chapterId: "cc-ch1", title: "Respiratory Mechanics",      description: "Tidal volume, FVC, FEV1, compliance and resistance" },
        ],
      },
      {
        id:    "anat-s3",
        title: "Nervous System",
        chapters: [
          { id: "anat-s3-c1", sourceType: "card", sourceId: "card-vite-build",    title: "CNS Structure & Function",      description: "Cerebral lobes, brainstem, cerebellum, spinal cord tracts" },
          { id: "anat-s3-c2", sourceType: "card", sourceId: "card-framer-motion", title: "PNS & Autonomic Divisions",     description: "Somatic vs autonomic, sympathetic vs parasympathetic" },
          { id: "anat-s3-c3", sourceType: "note", sourceId: "note-typescript-lecture", title: "Cranial Nerves Mnemonics",  description: "12 cranial nerves — origin, path, function, clinical tests" },
        ],
      },
    ],
  },
];

// ── Store singleton ─────────────────────────────────────────────────

let _certs: Certification[] = [...SEED];
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach(l => l());
}

export function getCertification(id: string): Certification | undefined {
  return _certs.find(c => c.id === id);
}

export function addCertification(cert: Omit<Certification, "id" | "createdAt">): Certification {
  const next: Certification = {
    ...cert,
    id:        `cert-custom-${Date.now()}`,
    createdAt: new Date(),
  };
  _certs = [..._certs, next];
  _notify();
  return next;
}

export function addChapterRef(certId: string, sectionId: string, ref: Omit<ChapterRef, "id">): void {
  _certs = _certs.map(cert => {
    if (cert.id !== certId) return cert;
    return {
      ...cert,
      syllabus: cert.syllabus.map(sec => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          chapters: [
            ...sec.chapters,
            { ...ref, id: `cref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        };
      }),
    };
  });
  _notify();
}

export function useCertificationsStore() {
  const [certs, setCerts] = useState(_certs);

  useEffect(() => {
    const sync = () => setCerts([..._certs]);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return {
    certifications: certs,
    getCertification,
    addCertification,
    addChapterRef,
  };
}

export type CertificationsStore = ReturnType<typeof useCertificationsStore>;
