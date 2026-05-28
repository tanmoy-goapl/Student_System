export type DefaultModeType = {
  id: number;
  title: string;
  subheading: string;
};

export const defaultModes: DefaultModeType[] = [
  {
    id: 1,
    title: "Explain",
    subheading: "Break down concepts",
  },
  {
    id: 2,
    title: "Practice",
    subheading: "Hands-on exercises",
  },
  {
    id: 3,
    title: "Analyze",
    subheading: "Deep analysis",
  },
  {
    id: 4,
    title: "Improve",
    subheading: "Improve your work",
  },
  {
    id: 5,
    title: "Career",
    subheading: "Career guidance",
  },
];

export const responseStyles = [
  {
    id: 1,
    title: "Simple",
    subheading: "Quick concise answers",
  },
  {
    id: 2,
    title: "Detailed",
    subheading: "In-depth explanations",
  },
  {
    id: 3,
    title: "Step-by-Step",
    subheading: "Guided walkthroughs",
  },
];

export const tones = [
  {
    id: 1,
    title: "Friendly",
  },
  {
    id: 2,
    title: "Professional",
  },
  {
    id: 3,
    title: "Concise",
  },
];