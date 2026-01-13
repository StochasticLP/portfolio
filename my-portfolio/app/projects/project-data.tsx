export interface Project {
  title: string;
  date: string;
  description: string;
  url: string;
  image: string;
}

export const projects: Project[] = [
  {
    title: "Interactive Cartpole Tutorial",
    date: "2025",
    description: "Standalone interactive cart-pole simulation (fullscreen canvas)",
    url: "/projects/cartpole",
    image: "/cartpole_thumbnail.png",
  },
];
