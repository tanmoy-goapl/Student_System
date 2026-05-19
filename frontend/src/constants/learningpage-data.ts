export type StrengthType = "weak" | "medium" | "strong" | "neutral";

export interface TopicItem {
  id: string;
  title: string;
}

export interface SubjectItem {
  id: string;
  title: string;
  color: string;
  topics?: TopicItem[];
}

export interface CategoryItem {
  id: string;
  title: string;
  remark: StrengthType;
  subjects: SubjectItem[];
}

export const SIDEBAR_DATA: CategoryItem[] = [
  {
    id: "physics",
    title: "Physics",
    remark: "medium",
    subjects: [
      {
        id: "wave-optics",
        title: "Wave Optics",
        color: "#ff6b6b",
        topics: [
          {
            id: "interference",
            title: "Interference of Light",
          },
          {
            id: "diffraction",
            title: "Diffraction",          
          },
          {
            id: "polarization",
            title: "Polarization",
          },
          {
            id: "young-double-slit",
            title: "Young Double Slit Experiment",
          },
        ],
      },

      {
        id: "electrostatics",
        title: "Electrostatics",
        color: "#f97316",
        topics: [
          {
            id: "coulombs-law",
            title: "Coulomb’s Law",
          },
          {
            id: "electric-field",
            title: "Electric Field",
          },
          {
            id: "electric-potential",
            title: "Electric Potential",
          },
          {
            id: "capacitors",
            title: "Capacitors",
          },
        ],
      },

      {
        id: "mechanics",
        title: "Mechanics",
        color: "#4ade80",
        topics: [
          {
            id: "laws-of-motion",
            title: "Laws of Motion",
          },
          {
            id: "work-energy-power",
            title: "Work Energy Power",
          },
          {
            id: "rotational-motion",
            title: "Rotational Motion",
          },
          {
            id: "gravitation",
            title: "Gravitation",
          },
        ],
      },

      {
        id: "thermodynamics",
        title: "Thermodynamics",
        color: "#06b6d4",
        topics: [
          {
            id: "laws-of-thermodynamics",
            title: "Laws of Thermodynamics",
          },
          {
            id: "heat-transfer",
            title: "Heat Transfer",
          },
          {
            id: "kinetic-theory",
            title: "Kinetic Theory of Gases",
          },
        ],
      },

      {
        id: "modern-physics",
        title: "Modern Physics",
        color: "#8b5cf6",
        topics: [
          {
            id: "photoelectric-effect",
            title: "Photoelectric Effect",
          },
          {
            id: "atoms-nuclei",
            title: "Atoms and Nuclei",
          },
          {
            id: "semiconductors",
            title: "Semiconductors",
          },
        ],
      },
    ],
  },

  {
    id: "mathematics",
    title: "Mathematics",
    remark: "strong",
    subjects: [
      {
        id: "algebra",
        title: "Algebra",
        color: "#3b82f6",
        topics: [
          {
            id: "quadratic-equations",
            title: "Quadratic Equations",
          },
          {
            id: "sequences-series",
            title: "Sequences and Series",
          },
          {
            id: "binomial-theorem",
            title: "Binomial Theorem",
          },
          {
            id: "complex-numbers",
            title: "Complex Numbers",
          },
        ],
      },

      {
        id: "calculus",
        title: "Calculus",
        color: "#10b981",
        topics: [
          {
            id: "limits",
            title: "Limits",
          },
          {
            id: "derivatives",
            title: "Derivatives",
          },
          {
            id: "applications-derivatives",
            title: "Applications of Derivatives",
          },
          {
            id: "integration",
            title: "Integration",
          },
        ],
      },

      {
        id: "coordinate-geometry",
        title: "Coordinate Geometry",
        color: "#f59e0b",
        topics: [
          {
            id: "straight-lines",
            title: "Straight Lines",
          },
          {
            id: "circles",
            title: "Circles",
          },
          {
            id: "parabola",
            title: "Parabola",
          },
          {
            id: "ellipse-hyperbola",
            title: "Ellipse and Hyperbola",
          },
        ],
      },

      {
        id: "trigonometry",
        title: "Trigonometry",
        color: "#ec4899",
        topics: [
          {
            id: "trigonometric-ratios",
            title: "Trigonometric Ratios",
          },
          {
            id: "trigonometric-identities",
            title: "Trigonometric Identities",
          },
          {
            id: "inverse-trigonometric-functions",
            title: "Inverse Trigonometric Functions",
          },
        ],
      },

      {
        id: "probability-statistics",
        title: "Probability & Statistics",
        color: "#6366f1",
        topics: [
          {
            id: "probability",
            title: "Probability",
          },
          {
            id: "permutations-combinations",
            title: "Permutations & Combinations",
          },
          {
            id: "statistics",
            title: "Statistics",
          },
        ],
      },
    ],
  },

  {
    id: "chemistry",
    title: "Chemistry",
    remark: "neutral",
    subjects: [
      {
        id: "physical-chemistry",
        title: "Physical Chemistry",
        color: "#14b8a6",
        topics: [
          {
            id: "mole-concept",
            title: "Mole Concept",
          },
          {
            id: "chemical-kinetics",
            title: "Chemical Kinetics",
          },
          {
            id: "thermodynamics-chem",
            title: "Chemical Thermodynamics",
          },
          {
            id: "electrochemistry",
            title: "Electrochemistry",
          },
        ],
      },

      {
        id: "organic-chemistry",
        title: "Organic Chemistry",
        color: "#f43f5e",
        topics: [
          {
            id: "hydrocarbons",
            title: "Hydrocarbons",
          },
          {
            id: "alcohols-phenols",
            title: "Alcohols and Phenols",
          },
          {
            id: "amines",
            title: "Amines",
          },
          {
            id: "biomolecules",
            title: "Biomolecules",
          },
        ],
      },

      {
        id: "inorganic-chemistry",
        title: "Inorganic Chemistry",
        color: "#84cc16",
        topics: [
          {
            id: "chemical-bonding",
            title: "Chemical Bonding",
          },
          {
            id: "coordination-compounds",
            title: "Coordination Compounds",
          },
          {
            id: "p-block-elements",
            title: "P-Block Elements",
          },
          {
            id: "d-f-block-elements",
            title: "D & F Block Elements",
          },
        ],
      },

      {
        id: "environmental-chemistry",
        title: "Environmental Chemistry",
        color: "#0ea5e9",
        topics: [
          {
            id: "water-pollution",
            title: "Water Pollution",
          },
          {
            id: "air-pollution",
            title: "Air Pollution",
          },
          {
            id: "green-chemistry",
            title: "Green Chemistry",
          },
        ],
      },
    ],
  },
];