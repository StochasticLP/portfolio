export interface Project {
  title: string;
  date: string;
  description: string;
  url: string;
  image: string;
}

export const projects: Project[] = [
  {
    title: "S2 Arena",
    date: "2026",
    description:
      "A simulator for the ARC Championship: rulebook arenas, an automatic referee, and real robot firmware in the loop. Six robots play one match, and people drive them from a browser.",
    url: "/projects/s2-arena",
    image: "/s2-arena.jpg",
  },
  {
    title: "RL Policy Training",
    date: "2026",
    description:
      "Multi-agent PPO for a team of three robots, trained in a fast fitted world and tested in MuJoCo. Includes the technical overview and the results so far.",
    url: "/projects/rl-policy",
    image: "/rl-policy.jpg",
  },
  {
    title: "Interactive Cartpole Tutorial",
    date: "2025",
    description: "A demonstration of different control techniques for a cartpole system implemented in Drake.",
    url: "/projects/cartpole",
    image: "/cartpole_thumbnail.png",
  },
  {
    title: "Feynman's Ratchet and Pawl",
    date: "2024",
    description: "This is a final project for Computational Physics II, demonstrating Feynman's Ratchet and Pawl thought experiment in 2D simulation.",
    url: "https://github.com/StochasticLP/Feynman-Ratchet-and-Pawl",
    image: "/chambers.gif",
  },
  {
    title: "ShadowCut",
    date: "2026",
    description:
      "Photograph loose tools and get laser-cut foam inserts. Vision measures each tool to true size, then a nesting search lays them out for your drawer.",
    url: "/shadowcut",
    image: "/shadowcut.jpg",
  },
  {
    title: "Modeling Income Distributions",
    date: "2023",
    description: "A numerical simulation of income distributions using Geometric Brownian motion.",
    url: "https://github.com/StochasticLP/Geometric-Brownian-Motion",
    image: "/gbm.png",
  },
  {
    title: "Learned Hash Functions",
    date: "2023",
    description: "The hash function of a hash table is replaced with a neural network in an attempt to reduce collisions.",
    url: "https://github.com/StochasticLP/Learned-Hash-Functions.git",
    image: "/hashmaps.png",
  },
  {
    title: "FFT Denoising Algorithm",
    date: "2024",
    description: "This is a simple python script and explanation demonstrating an image denoising using the Fast Fourier Transform algorithm.",
    url: "https://github.com/StochasticLP/FFT-denoise.git",
    image: "/fft.png",
  },
  {
    title: "3v3 Multiplayer Robot Sim",
    date: "2026",
    description: "A six-robot match you can join from your browser. Only live while the host is running a match.",
    url: "/3v3",
    image: "/logo.png",
  },
];
