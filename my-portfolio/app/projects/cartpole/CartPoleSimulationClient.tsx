"use client";
import dynamic from "next/dynamic";

const CartPoleSimulation = dynamic(() => import("./CartPoleSimulation"), { ssr: false });

export default function CartPoleSimulationClient(props) {
  return <CartPoleSimulation {...props} />;
}
