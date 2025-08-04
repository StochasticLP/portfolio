import CartPoleSimulationClient from ".//CartPoleSimulationClient";

export default function CartpoleCanvasPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent" }}>
      <CartPoleSimulationClient options={{ moonRender: false, width: 1000, height: 600 }} />
    </div>
  );
}
