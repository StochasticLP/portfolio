

import { socialLinks } from "./lib/config";
import CartPoleSimulationClient from "./components/cartpole/CartPoleSimulationClient";

export default function Page() {
  return (
      <>
      <section>
        <div className="px-14 pt-10 sm:px-10 md:px-12 max-w-screen-2xl mx-auto">
          <h1 className="mb-2 text-2xl font-medium">Welcome!</h1>
          <div className="flex flex-col md:flex-row gap-6 relative" style={{overflow: 'visible'}}>
            {/* Left: Text Content */}
            <div className="md:w-1/2 w-full prose prose-neutral dark:prose-invert relative" style={{zIndex: 1}}>
              <p>
                I'm an aspiring robotics researcher interested in vision-based learning and agile control.
                Check out my <a href="/projects">projects</a> page to see some of my work, or my <a href="/about">about</a> page
                to learn more about me.
              </p>
              <p>
                For now, enjoy this simple cartpole simulation built with matter-js. Use the 
                arrow keys to move the cart left and right. See how well you can 
                balance the pole without the PID controller!
              </p>
            </div>
            {/* Right: CartPole Simulation (overlapping, behind text) */}
            <div className="md:w-1/2 w-full flex items-center justify-center relative">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-3/10"
                style={{
                  zIndex: 0,
                  width: 2000,
                  height: 3000,
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                <CartPoleSimulationClient options={{ moonRender: true, width: 2000, height: 3000 }} />
              </div>
            </div>
          </div>
          </div>
        </section>
      </>
    );
}
 
