export interface Project {
  title: string;
  year: number;
  description: string;
  url: string;
}

export const projects: Project[] = [
  {
    title: "CartPole Simulation Canvas",
    year: 2025,
    description: "Standalone interactive cart-pole simulation (fullscreen canvas)",
    url: "projects/cartpole",
  },
];
