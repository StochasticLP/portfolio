import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleShell,
  Box,
  Bullets,
  Chips,
  Code,
  DataTable,
  Figure,
  Flow,
  H1,
  H2,
  H3,
  LinkRow,
  Note,
  P,
  Stats,
} from "../article-kit";
import { WinRateBars, WinRateChart, type WinRatePoint } from "../win-rate-chart";

export const metadata: Metadata = {
  title: "RL Policy Training",
  description:
    "Training a team of three robots with multi-agent PPO in a fast fitted world, then closing the gap to the MuJoCo game world.",
};

// Evaluation logs, sampled policy against ScriptedBot. All values are percent.
// Fast world: 200 matches. Game world: 40 matches to checkpoint 1750, then 80.
const ppo7: { x: number; fast: number; fastCi: number[]; game: number; gameCi: number[] }[] = [
  [250, 43.5, 36.8, 50.4, 5.0, 1.4, 16.5],
  [500, 28.5, 22.7, 35.1, 2.5, 0.4, 12.9],
  [750, 40.5, 33.9, 47.4, 10.0, 4.0, 23.1],
  [1000, 59.5, 52.6, 66.1, 10.0, 4.0, 23.1],
  [1250, 33.0, 26.9, 39.8, 15.0, 7.1, 29.1],
  [1500, 46.5, 39.7, 53.4, 10.0, 4.0, 23.1],
  [1750, 45.0, 38.3, 51.9, 12.5, 5.5, 26.1],
  [2125, 57.0, 50.1, 63.7, 11.3, 6.0, 20.0],
  [2375, 40.5, 33.9, 47.4, 11.3, 6.0, 20.0],
  [2625, 57.0, 50.1, 63.7, 10.0, 5.2, 18.5],
  [2875, 60.5, 53.6, 67.0, 18.8, 11.7, 28.7],
  [3125, 64.0, 57.1, 70.3, 10.0, 5.2, 18.5],
  [3375, 69.0, 62.3, 75.0, 17.5, 10.7, 27.3],
  [3625, 46.0, 39.2, 52.9, 8.7, 4.3, 17.0],
  [3875, 74.0, 67.5, 79.6, 13.8, 7.9, 23.0],
  [4125, 49.0, 42.2, 55.9, 6.2, 2.7, 13.8],
  [4375, 74.5, 68.0, 80.0, 21.2, 13.7, 31.4],
  [4625, 52.5, 45.6, 59.3, 15.0, 8.8, 24.4],
  [4875, 57.5, 50.6, 64.1, 7.5, 3.5, 15.4],
  [5125, 62.5, 55.6, 68.9, 16.3, 9.7, 25.8],
  [5375, 58.5, 51.6, 65.1, 20.0, 12.7, 30.0],
  [5625, 58.5, 51.6, 65.1, 13.8, 7.9, 23.0],
  [5875, 42.5, 35.9, 49.4, 7.5, 3.5, 15.4],
  [6125, 61.5, 54.6, 68.0, 16.3, 9.7, 25.8],
  [6375, 38.0, 31.6, 44.9, 7.5, 3.5, 15.4],
  [6625, 45.5, 38.7, 52.4, 15.0, 8.8, 24.4],
].map(([x, fast, fl, fh, game, gl, gh]) => ({
  x,
  fast,
  fastCi: [fl, fh],
  game,
  gameCi: [gl, gh],
}));

// Fine-tuning in the game world: game1 to update 400, then game3 from game1's checkpoint 400.
// The x axis is total game-world updates. Each evaluation is 80 matches.
const fineTune: WinRatePoint[] = [
  { x: 100, y: 13.8, lo: 7.9, hi: 23.0 },
  { x: 200, y: 16.3, lo: 9.7, hi: 25.8 },
  { x: 300, y: 17.5, lo: 10.7, hi: 27.3 },
  { x: 400, y: 30.0, lo: 21.1, hi: 40.8 },
  { x: 450, y: 35.0, lo: 25.5, hi: 45.9 },
  { x: 500, y: 18.8, lo: 11.7, hi: 28.7 },
  { x: 550, y: 20.0, lo: 12.7, hi: 30.0 },
  { x: 600, y: 30.0, lo: 21.1, hi: 40.8 },
  { x: 650, y: 22.5, lo: 14.7, hi: 32.8 },
  { x: 700, y: 31.2, lo: 22.2, hi: 42.1 },
  { x: 750, y: 28.7, lo: 20.0, hi: 39.5 },
  { x: 800, y: 38.8, lo: 28.8, hi: 49.7 },
  { x: 850, y: 23.7, lo: 15.8, hi: 34.1 },
  { x: 900, y: 21.2, lo: 13.7, hi: 31.4 },
  { x: 950, y: 31.2, lo: 22.2, hi: 42.1 },
  { x: 1000, y: 20.0, lo: 12.7, hi: 30.0 },
];

const dagger = [
  { label: "Clone", value: 0 },
  { label: "Round 1", value: 0 },
  { label: "Round 2", value: 1.5 },
  { label: "Round 3", value: 10.5 },
  { label: "Round 4", value: 21 },
  { label: "Round 5", value: 34.5, detail: "Wilson 95 %: 28.3 to 41.3" },
  { label: "Round 6", value: 33.5, detail: "Wilson 95 %: 27.3 to 40.3" },
];

const heads = [
  ["move", "25", "Stop, or 8 directions in the gimbal frame at 3 speeds"],
  ["spin", "5", "Spin rate, 0 to 15 rad/s"],
  ["target", "4", "Pointer over visible enemies, or no target"],
  ["look", "8", "Gimbal sector to search"],
  ["fire", "2", "Fire or hold"],
  ["buy", "4", "Ammunition to buy"],
];

export default function RlPolicyPage() {
  return (
    <ArticleShell>
      <H1>RL Policy Training</H1>
      <P>
        We train a team of three robots to play full 3v3 matches, with multi-agent PPO. The policy
        chooses how to move, whom to target, when to fire and what to buy. It plays through the same
        interface as a human driver. Most of the work is not the network. It is making a fast
        training world agree with the slow, accurate one.
      </P>
      <LinkRow
        links={[
          { label: "Results so far", href: "#results", primary: true },
          { label: "S2 Arena", href: "/projects/s2-arena" },
          { label: "Open Driving Sim", href: "/3v3" },
        ]}
      />

      <Stats
        items={[
          { value: "38.8%", label: "best game-world win rate, 31 of 80 matches" },
          { value: "3%", label: "game-world win rate before the gap work" },
          { value: "74.5%", label: "best fast-world win rate, 200 matches" },
          { value: "50%", label: "game-world target, not reached yet" },
        ]}
      />

      <H2>The goal</H2>
      <P>
        The first goal is a policy that beats ScriptedBot in the MuJoCo game world. ScriptedBot is
        our hand-written team strategy, with path planning, target selection and resupply. After
        that, the policy improves through self-play. The team can then use it as a practice
        opponent for drivers and as a tool to test strategy.
      </P>
      <P>
        Training only in MuJoCo is too slow. Our training logs show 2 to 3 batched decisions per
        second in the game world, against about 23 in the fast world on the same machine. So we
        train in a fast world that is fitted to the game world, and the game world is the only test
        that counts.
      </P>

      <H2>How it works</H2>
      <Figure
        number={1}
        caption="The training loop. The game world is the source of truth. The parity gate stops a bad fit from reaching training."
      >
        <div className="grid gap-2 md:grid-cols-2">
          <Box
            title="1. Log the game world"
            detail="800 scripted matches gave 889,124 shots. Each shot stores the full state of all six robots."
            accent="yellow"
          />
          <Box
            title="2. Fit the fast world"
            detail="Tables for terrain and mobility, plus a learned hit model."
            accent="yellow"
          />
        </div>
        <Flow>Parity gate: the same matches in both worlds must agree on checks such as time to kill and victory points</Flow>
        <div className="grid gap-2 md:grid-cols-2">
          <Box
            title="3. Clone, then DAgger"
            detail="Start from imitation of ScriptedBot, not from random play."
            accent="blue"
          />
          <Box
            title="4. MAPPO in the fast world"
            detail="Against scripted bots and frozen snapshots of the policy."
            accent="blue"
          />
        </div>
        <Flow>Evaluate each checkpoint in the fast world and the game world</Flow>
        <div className="grid gap-2 md:grid-cols-2">
          <Box
            title="5. Fine-tune in the game world"
            detail="Slow, but it trains on the true physics."
            accent="red"
          />
          <Box
            title="6. Find each gap, and refit"
            detail="New logs refit the hit model. A refit needs held-out calibration and parity to pass."
            accent="red"
          />
        </div>
      </Figure>

      <H3>The fast world</H3>
      <P>
        The fast world is a 2.5D batched simulator in C++ with pybind11. It runs at about 20,000
        times real time, and it uses the same referee and slot interface as the game world. Rounds
        do not fly. A learned hit model predicts each shot: target, other robot, or no hit. The
        model is an MLP over 26 features at launch time, trained on 886,213 logged shots. On
        held-out seeds, the log-loss is 0.409, accuracy is 0.815, and each reliability decile is
        within 0.03 of the observed rate.
      </P>

      <H3>The policy</H3>
      <P>
        All robots share one recurrent actor. Attention lets it handle enemies that appear and
        disappear, and a pointer head lets it choose among them. The critic sees the full referee
        state, but only during training. The actor sees only what its robot may know, with a
        command delay of 150 to 250 ms and decisions at 10 Hz. Rewards are shared by the team.
      </P>
      <Figure
        number={2}
        caption="The MAPPO network. Invalid actions and missing entities are masked. The critic is not used at match time."
      >
        <div className="grid gap-2 md:grid-cols-2">
          <Box title="Own state" detail="Self, armor hits by plate, robot type" accent="blue">
            <Chips items={["MLP"]} />
          </Box>
          <Box title="Entities" detail="3 enemies and 2 teammates, 13 features each" accent="blue">
            <Chips items={["Shared MLP", "Multi-head attention", "Masked mean pool"]} />
          </Box>
        </div>
        <Flow>Concatenate</Flow>
        <Box title="GRU" detail="Memory across decisions, for enemies out of sight" accent="green" />
        <Flow>Six action heads</Flow>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {heads.map(([name, size]) => (
            <Box key={name} title={name} detail={`${size} options`} accent="yellow" />
          ))}
        </div>
      </Figure>
      <DataTable
        headers={["Head", "Size", "Meaning"]}
        rows={heads.map(([name, size, meaning]) => [name, size, meaning])}
      />
      <P>
        PPO runs on an AMD RX 7900 XTX through ROCm in WSL. Blue matches are mirrored about the
        field center, so the policy always plays from one side. This one change took a checkpoint
        from 0 % to 34 % as blue in the fast world, with no new training.
      </P>

      <H3>Imitation first</H3>
      <P>
        PPO from random weights did not learn: 316 updates stayed at a 0 % win rate. So we started
        with behavior cloning. The clone had good accuracy on held-out data, but it lost 200 of 200
        matches. It waited at spawn, because a robot at spawn is mostly labeled &quot;wait&quot;.
        DAgger fixed this: the clone drives, and the expert labels the states the clone really
        reaches.
      </P>
      <Figure
        number={3}
        caption="DAgger rounds, 200 fast-world matches each, against ScriptedBot. The quantised bot itself wins 42 %, so this is close to the limit of imitation."
      >
        <WinRateBars title="Fast-world win rate after each DAgger round" rows={dagger} />
      </Figure>

      <H2>The sim-to-game gap</H2>
      <P>
        A policy with a 31.5 % win rate in the fast world won only 3 % of 100 game-world matches.
        The hit model was not the cause: it stayed calibrated on the policy&apos;s own shots. Each
        cause below came from logged data, and each physics fix went through the parity gate.
      </P>
      <DataTable
        headers={["What the logs showed", "Cause", "Fix"]}
        rows={[
          [
            "Scripted bots stuck for 75 % of the Hero's alive time",
            "Recovery logic reversed its last backup, so the bot moved back and forth",
            "Fixed the bot, then logged all matches again",
          ],
          [
            "Policy stuck on walls 25 to 63 % of its moving time",
            "The fast world let robots slide along walls at full speed, so the policy learned to ride them",
            "An along-wall deceleration, fitted to MuJoCo",
          ],
          [
            "Policy spent 77 % of its time in its base",
            "The fast chassis ran about 37 % faster than the game chassis",
            "Added the fitted velocity and spin gains",
          ],
          [
            "Greedy play won 0.5 %, sampled play 14.5 %",
            "PPO trains a stochastic policy, and its most likely action is a different player",
            "Evaluate the sampled policy",
          ],
          [
            "25 % wins as red, 4 % as blue",
            "The policy had never trained as blue",
            "Mixed colors, then mirrored blue",
          ],
          [
            "A live robot pushed a parked robot too fast",
            "No limit on push speed",
            "A push cap fitted to MuJoCo",
          ],
        ]}
      />

      <H2 id="results">Results so far</H2>
      <P>
        All results are against ScriptedBot with the sampled policy. Intervals are Wilson 95 %.
        These checkpoints are from the 2025-26 3v3 game, in the game world that uses fitted
        controllers.
      </P>

      <Figure
        number={4}
        caption="Main run (ppo7). The fast-world win rate rose, but the game-world rate rose much less. This gap is why we moved to fine-tuning in the game world. Move the pointer over the chart to read each checkpoint."
      >
        <WinRateChart
          title="Win rate by checkpoint, fast world and game world"
          xLabel="Update"
          series={[
            {
              name: "Fast world (200 matches)",
              color: "var(--chart-1)",
              points: ppo7.map((p) => ({ x: p.x, y: p.fast, lo: p.fastCi[0], hi: p.fastCi[1] })),
            },
            {
              name: "Game world (40 to 80 matches)",
              color: "var(--chart-2)",
              dashed: true,
              points: ppo7.map((p) => ({ x: p.x, y: p.game, lo: p.gameCi[0], hi: p.gameCi[1] })),
            },
          ]}
          reference={{ y: 50, label: "50 %" }}
        />
      </Figure>

      <Figure
        number={5}
        caption="Fine-tuning in the game world, 80 matches per point, with the Wilson interval as a band. The first run (game1) reached 30 % at update 400. A second run (game3) continued from that checkpoint with only the victory-point shaping term, a longer rollout and a lower learning rate."
      >
        <WinRateChart
          title="Game-world win rate during fine-tuning"
          xLabel="Total update"
          yMax={60}
          series={[{ name: "Game world", color: "var(--chart-2)", points: fineTune, band: true }]}
          reference={{ y: 50, label: "Target: 50 %" }}
          markers={[{ x: 400, label: "game3 starts" }]}
        />
      </Figure>

      <DataTable
        headers={["Stage", "Fast world", "Game world"]}
        rows={[
          ["DAgger clone (round 5)", "34.5 %", "3 % (3 of 100)"],
          ["PPO, before the gap work (ppo2)", "31.5 %", "0 % (0 of 100)"],
          ["PPO with the fixes (ppo7), best checkpoint in the game", "74.5 %", "21.2 % (17 of 80)"],
          ["Game-world fine-tuning (game3), best checkpoint", "not tested", "38.8 % (31 of 80)"],
        ]}
      />
      <Note>
        38.8 % is the best of 12 evaluations, so it is optimistic. Its interval is 28.8 to 49.7 %.
        Across all 12 game3 evaluations the mean is 26.8 %, and the best three-evaluation moving
        average is 32.9 %. The fine-tuning run reached a plateau at update 600 of that run. There
        was no collapse, but win rates still move a lot from one checkpoint to the next.
      </Note>

      <H2>What we learned</H2>
      <Bullets
        items={[
          "A fitted simulator needs a gate. Parity checks found bugs that win rate could not show, and one of them was in our own scripted bot.",
          "The policy finds each error in the simulator. Wall sliding was a small modeling error, and the policy made it a strategy.",
          "Evaluate what you trained. A greedy evaluation of a stochastic policy reported a player that did not exist.",
          "Report the interval. With 80 matches, a change of 10 points is often only noise.",
        ]}
      />

      <H2>What is next</H2>
      <Bullets
        items={[
          "Close the fire-rate gap. In the game world the policy launches 0.455 shots per fire decision, against 0.591 in the fast world. A target that spins fast shows the largest difference.",
          "A refresh loop that adds new game-world logs during training, with each refit gated by held-out calibration.",
          "A surrogate over the full arena state, in place of the 26 hand-made features.",
          "A self-play league of frozen snapshots and scripted bots, after the policy beats the script.",
          <>
            A port to the Season 2 rules on the{" "}
            <Link
              href="/projects/s2-arena"
              className="text-[var(--text-primary)] underline underline-offset-2"
            >
              S2 Arena
            </Link>
            , with <Code>Level K</Code> commands to the real firmware stack.
          </>,
        ]}
      />
      <p className="mb-8 mt-8 text-xs text-[var(--text-secondary)]">
        The training code is in a private team repository.
      </p>
    </ArticleShell>
  );
}
