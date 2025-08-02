

import StarBackground from "./components/star-background";
import { socialLinks } from "./lib/config";
import CartPoleSimulationClient from "./projects/cartpole/CartPoleSimulationClient";

export default function Page() {
  return (
      <>
        <StarBackground />
        <section>
          <h1 className="mb-8 text-2xl font-medium">Welcome!</h1>
          <div className="flex flex-col md:flex-row gap-8 relative" style={{overflow: 'visible'}}>
            {/* Left: Text Content */}
            <div className="md:w-1/2 w-full prose prose-neutral dark:prose-invert relative" style={{zIndex: 1}}>
              <p>
                This is the first randition of my portfolio page. I am to add much more
                in the future such as blog posts, projects, and more!
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
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-2/5"
                style={{
                  zIndex: 0,
                  width: 1600,
                  height: 600,
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                <CartPoleSimulationClient options={{ moonRender: true, width: 1600, height: 680 }} />
              </div>
            </div>
          </div>
        </section>
      </>
    );
}
 
