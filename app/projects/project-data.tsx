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
];
