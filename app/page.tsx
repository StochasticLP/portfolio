import LunarPendulumHero from "./components/lunar-pendulum/LunarPendulumHero";

export default function Page() {
  return (
    <section>
      <div className="px-4 pt-10 sm:px-10 md:px-12 max-w-screen-2xl mx-auto">
        <h1 className="mb-2 text-2xl font-medium">Welcome!</h1>
        <LunarPendulumHero>
          <p>
            I'm an aspiring robotics researcher interested in vision-based learning and agile control.
            Check out my <a href="/projects">projects</a> page to see some of my work, or my <a href="/about">about</a> page
            to learn more about me.
          </p>
          <p>
            This is a triple pendulum on a cart on the Moon (g = 1.62 m/s²). It has eight stationary states, and only the all-down state is
            stable. Direct collocation found a path between each pair of states, and a time-varying LQR controller tracks it. Pick a start
            and an end state to watch the 56 recorded transitions, or let it cycle through all of them.
          </p>
        </LunarPendulumHero>
      </div>
    </section>
  );
}
