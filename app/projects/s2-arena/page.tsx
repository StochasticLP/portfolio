import Image from "next/image";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "S2 Arena",
  description:
    "A simulator for the ARC Championship: rulebook arenas, an automatic referee, and real robot firmware in the loop.",
};

// Placeholder until the public repository exists. Replace this one value.
const S2_ARENA_REPO_URL = "#repo";

const perception = [
  {
    level: "0",
    name: "Ground truth",
    gets: "Exact pose of all robots, rounds and objectives. Debug only.",
    cost: 1,
  },
  {
    level: "1",
    name: "State estimates",
    gets: "Pose, velocity and type of each visible enemy, with field of view, range, line of sight, dropout, latency and noise.",
    cost: 2,
  },
  {
    level: "2",
    name: "Detections",
    gets: "Four corner pixels per visible armor plate, light color, number and confidence, with pixel noise, misses, false positives and motion blur.",
    cost: 3,
  },
  {
    level: "3",
    name: "Images",
    gets: "Rendered aim-camera frames, as JPEG or H.264 from the server, or drawn by the client from a culled pose stream.",
    cost: 5,
  },
];

export default function S2ArenaPage() {
  return (
    <ArticleShell>
      <H1>S2 Arena</H1>
      <P>
        A full simulator for the ARC Championship (ARCC), built with CU Robotics. It generates
        rulebook arenas, inspects robots, and referees matches automatically. Six robots can play
        one match, and each robot can run the team&apos;s real firmware against a MuJoCo plant.
        People drive those robots from a browser.
      </P>

      <LinkRow
        links={[
          { label: "Open Driving Sim", href: "/3v3", primary: true },
          { label: "S2 Arena repo", href: S2_ARENA_REPO_URL, note: "coming soon" },
          { label: "RL policy training", href: "/projects/rl-policy" },
        ]}
      />
      <p className="mt-3 text-xs text-[var(--text-secondary)]">
        Driving Sim runs on a host machine, so it is only live while that host is running a match.
      </p>

      <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <Image
          src="/s2-arena.jpg"
          alt="The 2026-27 3v3 field in the simulator, with ramps, walls, tile surfaces, objectives and two robots"
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover"
          priority
        />
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        The 2026-27 3v3 field, composed by the arena generator and drawn with the MuJoCo renderer.
        The robots are the generic reference robots.
      </p>

      <Stats
        items={[
          { value: "2", label: "seasons of rules, keyed as data" },
          { value: "1 kHz", label: "physics step, with a 100 Hz control tick" },
          { value: "6", label: "robots per match, each with private firmware" },
          { value: "4", label: "perception levels, from ground truth to images" },
        ]}
      />

      <H2>Why we built it</H2>
      <P>
        ARCC is a robot combat competition. Teams build robots that fire projectiles at armor
        plates. A referee system on each robot measures hits, power, barrel heat and muzzle speed,
        and it can cut power when a robot breaks a limit. A team gets very little time on a real
        field, and a broken robot stops all testing.
      </P>
      <P>
        The first simulator drove one robot with real firmware. Then the team needed full matches,
        so that drivers could practice and strategy could be tested. When the Season 2 manuals
        came out, the rules changed. We decided to build the simulator so that a new season is new
        data, not an edit to old code. The goal has three parts:
      </P>
      <Bullets
        items={[
          <>
            <strong className="font-medium text-[var(--text-primary)]">Inspect</strong> any robot
            against the building rules, as event Inspection does.
          </>,
          <>
            <strong className="font-medium text-[var(--text-primary)]">Referee</strong> any robot
            at runtime: chassis power, barrel heat, muzzle speed, armor hits, HP, penalties,
            autonomy and ammunition.
          </>,
          <>
            <strong className="font-medium text-[var(--text-primary)]">Play</strong> on arenas
            built to the dimensions in the manuals: 2026-27 3v3 and 1v1, and 2025-26 3v3.
          </>,
        ]}
      />

      <H2>System architecture</H2>
      <P>
        The match server has one rule at its center: the world does not know the referee. The
        physics world reports events. The referee turns events into decisions. The game mode
        connects the two. So each part can be tested alone, and the same referee can run any
        season. The core is C++20 with Python bindings.
      </P>

      <Figure
        number={1}
        caption="One match. Controllers of any type connect through the same interface, and all of them stay behind the same referee and power gate."
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Box title="Browser drivers" detail="Humans, in Driving Sim" accent="blue" />
          <Box title="Scripted bots" detail="Rule-based opponents" accent="blue" />
          <Box title="RL policies" detail="Out-of-process controllers" accent="blue" />
          <Box title="Team firmware" detail="Real code, on the plant" accent="blue" />
        </div>
        <Flow>
          Level K: velocity, gimbal and fire commands. Level M: raw sensors and referee serial
          bytes in, motor commands out.
        </Flow>
        <div className="rounded-md border border-dashed border-[var(--text-secondary)] p-3">
          <div className="mb-2 text-xs font-medium text-[var(--text-primary)]">Match server</div>
          <div className="grid gap-2 md:grid-cols-3">
            <Box
              title="InputRouter"
              detail="Enforces the operating mode and autonomy rules for each slot."
            />
            <Box
              title="GameMode"
              detail="Roster, arena, periods and win logic. One mode per Events chapter."
            />
            <Box
              title="Referee"
              detail="Pure rules. Event in, decision out. Deterministic, with no physics."
              accent="yellow"
            />
          </div>
          <Flow>Events go up to the referee. Decisions (HP, cuts, cards, VP) come back down.</Flow>
          <Box
            title="Physics world (MuJoCo)"
            detail="Arena, robots, rounds and objectives, at 1 kHz. Deterministic from a seed."
            accent="green"
          >
            <Chips
              items={[
                "PowerGate",
                "ArmorSensor x4",
                "SpeedMonitor",
                "RFID",
                "MainControl",
                "Lights",
                "SupercapMeter",
              ]}
            />
          </Box>
        </div>
        <Flow>Everything above is built from data</Flow>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Box title="Rules" detail="Per-season YAML, each value cited" />
          <Box title="arena_gen" detail="Parametric MJCF plus zones" />
          <Box title="Robot packages" detail="Model plus manifest" />
          <Box title="Recordings" detail="Exact replay from commands" />
        </div>
      </Figure>

      <H3>We copy the real referee system</H3>
      <P>
        Teams do not write the referee. The organizers lend each team the hardware, and team code
        can only read it through a serial port. We copy that boundary exactly. Each real module has
        a simulated part, so any firmware that works on a real robot can read the same data here.
      </P>
      <DataTable
        headers={["Real module", "What it does", "Simulated part"]}
        rows={[
          [
            "Power Management",
            "Measures chassis power and cuts outputs on a penalty",
            <Code key="a">PowerGate</Code>,
          ],
          [
            "Armor Module x4",
            "Detects hits and collisions on each plate",
            <Code key="b">ArmorSensor</Code>,
          ],
          [
            "Speed Monitor",
            "Measures each muzzle speed. Barrel heat comes from this",
            <Code key="c">SpeedMonitor</Code>,
          ],
          [
            "Main Control",
            "Holds robot state and gives team code the referee serial port",
            <Code key="d">MainControl</Code>,
          ],
          ["RFID", "Reads cards under zones, such as resupply", <Code key="e">Rfid</Code>],
          [
            "Light Indicators",
            "Team color, HP, buffs. Opponents aim at the plate lights",
            <Code key="f">Lights</Code>,
          ],
        ]}
      />

      <H3>Rules are data</H3>
      <P>
        Limits, damage, heat, victory points and durations live in YAML under{" "}
        <Code>rules/&lt;season&gt;/</Code>, and each value cites its manual section. C++ and Python
        load the same files. A mode is named <Code>3v3@2025-26</Code>, so an older season stays
        playable with its own rules, arena and robots.
      </P>

      <H3>Robots are packages</H3>
      <P>
        A robot is a <Code>robot.yaml</Code> manifest and a <Code>model.xml</Code>. The arena has no
        code that is specific to our robots. Inspection reads a package and makes the static checks
        that event Inspection makes: weight, dimensions, armor placement, launchers, battery and
        supercap energy. The repo includes generic, rule-legal reference robots that come only from
        rulebook limits.
      </P>

      <div className="relative my-8 aspect-video w-full overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <Image
          src="/s2-arena-field.jpg"
          alt="View from above of the whole 3v3 field, with base platforms, a central wall and ramps"
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover"
        />
      </div>

      <H2>What it can simulate</H2>
      <DataTable
        headers={["Area", "Model"]}
        rows={[
          [
            "Rigid bodies",
            "Chassis, suspension, omni and mecanum wheels, gimbal, ramps, walls and objectives, with contacts, in MuJoCo at 1 kHz.",
          ],
          [
            "Projectiles",
            "17 mm and 42 mm rounds with gravity and quadratic drag (midpoint RK2). Each step tests a swept sphere against plate faces and a ray against other geometry. Dispersion, speed spread and resting rounds are included.",
          ],
          [
            "Electrical power",
            "A DC motor model per motor: I = (V - k_e w) / R, clipped to the current limit. It includes copper loss and regeneration. The referee integrates the limit minus measured power into the 60 J buffer. A cut makes the wheels coast.",
          ],
          [
            "Referee",
            "HP, armor damage, barrel heat, over-speed, over-power, respawn, penalties, resupply, autonomy, objectives and victory points.",
          ],
          [
            "Perception",
            "Four levels, chosen per slot. The server sends each robot only what that level allows (Figure 2).",
          ],
          [
            "Timing",
            "Lockstep for training and tests, so that the same seed and commands give the same bytes. Real time for external hardware: late commands are held and counted, as on a real field.",
          ],
        ]}
      />

      <Figure
        number={2}
        caption="Perception levels. The bar shows relative compute cost, not a measurement. Level 3 is for testing a vision pipeline, not for training a detector, because the renderer is not photorealistic."
      >
        <div className="space-y-3">
          {perception.map((row) => (
            <div key={row.level} className="grid gap-1 md:grid-cols-[10rem_1fr] md:gap-3">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Level {row.level}: {row.name}
                </div>
                <div
                  className="mt-1 h-1.5 rounded-full bg-[var(--color-accent-green)]"
                  style={{ width: `${row.cost * 20}%` }}
                />
              </div>
              <div className="text-xs leading-relaxed text-[var(--text-secondary)]">{row.gets}</div>
            </div>
          ))}
        </div>
      </Figure>

      <H2>Firmware in the loop and the robot plant</H2>
      <P>
        Most robot simulators use an ideal controller. We run the team&apos;s real firmware
        instead. The estimator, reference governor, controllers and safety state all run as they do
        on the robot. Only the hardware layer changes: stubs replace CAN and sensors, and a virtual
        clock replaces the hardware clock. No firmware source is copied. It compiles from a git
        submodule, so the simulator always runs the firmware the team really uses.
      </P>
      <P>
        Firmware was never written to run many times in one process. It keeps process-wide globals.
        So we split the robot into two libraries with a plain C boundary. Each robot loads a private
        copy of the firmware library, and a fault in one robot leaves the others alone.
      </P>

      <Figure
        number={3}
        caption="The plant-firmware boundary. The plant never links the firmware. The C ABI has no C++ types and no exceptions."
      >
        <div className="grid items-stretch gap-2 md:grid-cols-[1fr_auto_1fr]">
          <Box
            title="Plant (static library)"
            detail="MuJoCo model, device bindings, realism settings, motor envelope, sensing and actuation."
            accent="green"
          >
            <Chips items={["Simulation", "DeviceBindings", "Realism", "FirmwareInstance"]} />
          </Box>
          <div className="flex flex-row items-center justify-center gap-2 px-2 py-1 text-center text-[11px] leading-snug text-[var(--text-secondary)] md:flex-col">
            <span aria-hidden="true">→</span>
            <span>
              encoders, gyro,
              <br />
              referee bytes
            </span>
            <span className="rounded bg-[var(--bg-primary)] px-2 py-1 font-mono text-[var(--text-primary)]">
              rm_fw_*
            </span>
            <span>
              motor
              <br />
              commands
            </span>
            <span aria-hidden="true">←</span>
          </div>
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)]"
            />
            <div className="relative h-full">
              <Box
                title="Firmware (one copy per robot)"
                detail="Real control code, plus simulated motors, encoders and gyro. Exports only the C ABI."
                accent="red"
              >
                <Chips items={["Estimator", "Governor", "Controllers", "Safety state"]} />
              </Box>
            </div>
          </div>
        </div>
      </Figure>

      <P>
        <Code>FirmwareInstance</Code> copies the shared library to a unique temp file, opens it with{" "}
        <Code>dlopen(RTLD_NOW | RTLD_LOCAL)</Code>, unlinks the file and resolves each{" "}
        <Code>rm_fw_*</Code> symbol. Each copy has its own globals. A safety fault in firmware
        becomes a <Code>FirmwareFault</Code> in Python, and a reset starts a new episode.
      </P>
      <P>
        The robot configuration uses the same path as the real robot. A small Rust tool turns the
        team&apos;s robot YAML files into the packets that the robot computer sends to firmware. In the arena, this is the Level M interface: each tick the firmware reads simulated
        sensors and referee bytes, and it returns motor commands. A browser driver or RL policy
        sends Level K intent into that same stack, so a person drives a robot with the real control
        loops.
      </P>

      <H3>Plant fidelity</H3>
      <P>
        The plant uses omni wheels on sprung corners, a motor model with a back-EMF current
        envelope, and gimbal numbers from CAD and measured replays. Each number has a recorded
        source, and we keep a numbered list of assumptions. We mark each value as measured, from
        CAD, from a data sheet, or a guess. This list shows where results can be trusted.
      </P>
      <P>
        A wheel model made a large speed change. We replaced rings of roller spheres with one
        ellipsoid on each axle, carried by one free roller hinge that resets each step. A 3v3 match
        has a fifth of the bodies and contacts. With a projectile grid and work on hot paths, matches
        run about 2.3 times faster.
      </P>

      <Figure
        number={4}
        caption="Three levels of fidelity. Each lower level is fitted to, and tested against, the level above it. The fast world is for reinforcement learning."
      >
        <div className="grid gap-2 md:grid-cols-3">
          <Box
            title="Firmware sim"
            detail="Real firmware on the full plant. Use it for how the robot really drives and aims."
            accent="red"
          >
            <Chips items={["Highest fidelity", "Robot questions"]} />
          </Box>
          <Box
            title="Game world"
            detail="Six robots in MuJoCo with controllers fitted to the firmware sim. Use it for match questions."
            accent="yellow"
          >
            <Chips items={["42 of 45 fit cells pass", "Match questions"]} />
          </Box>
          <Box
            title="Fast world"
            detail="A 2.5D batched world with fitted tables, at about 20,000x real time. Used for training."
            accent="blue"
          >
            <Chips items={["Parity gates", "Training"]} />
          </Box>
        </div>
      </Figure>

      <H2>Driving Sim</H2>
      <P>
        <a href="/3v3" className="text-[var(--text-primary)] underline underline-offset-2">
          Driving Sim
        </a>{" "}
        is the front end. Anyone can open a link and drive a robot with no install. One server
        process hosts several games. A player hosts a game and gets a six-character code. Each of
        the six slots can be a human, a scripted bot or a policy, and empty slots become bots.
      </P>
      <Bullets
        items={[
          "Three transports carry the match, in order of preference: a WebRTC data channel, WebSocket, and SSE. A tunnel forwards only TCP, so the client falls back by itself.",
          "The server decides what each client sees. Clients get only the state their robot may know, and the viewer draws it.",
          "Auto-aim runs only on the server, so competition code never reaches a browser.",
          "Each match records to disk. Replays re-simulate from the recorded commands.",
          "First and third person, a spectator view, a lobby, and ranked accounts.",
        ]}
      />

      <H2>Open source boundary</H2>
      <P>
        The arena is built to be released under Apache-2.0, for other teams. The team&apos;s
        competition software stays private. A test fails the build if the public tree imports
        anything from the private side, and private values stay in one adapter folder.
      </P>
      <Figure
        number={5}
        caption="The public arena has no knowledge of our robots. The private adapter is how our robots enter a match."
      >
        <div className="grid gap-2 md:grid-cols-2">
          <Box title="Public: arena" detail="Generic, and safe to share." accent="green">
            <Chips items={["rules", "referee", "inspection", "arena_gen", "world", "reference_robots"]} />
          </Box>
          <Box title="Private: sim_plant" detail="Our real robots, on Level M." accent="red">
            <Chips items={["Robot configuration", "Firmware library", "Real gimbal numbers", "Auto-aim"]} />
          </Box>
        </div>
      </Figure>

      <H2>Current status</H2>
      <Bullets
        items={[
          "Working: 1v1 and 3v3 2026-27, and 3v3 2025-26, on the arena code, with real firmware on the plant for each robot. A full match with the team's auto-aim on both sides runs with zero plant faults.",
          "In progress: a simulated LiDAR sensor and localization, for the Sentry.",
          "Open: the Site Manual and Communication Protocol for Season 2 are not out yet, so the parts that depend on them are marked to be done.",
          "Stretch goals: the Drone Challenge and Dart Challenge need flight models.",
        ]}
      />
      <Note>
        This project is unofficial. It is not affiliated with or endorsed by ARC Robotics, DJI or
        RoboMaster. Drivetrain losses and some shot numbers are still estimates, and match results
        have not been validated against a real robot on a field. Use them for strategy, not as
        proof of real performance.
      </Note>
      <p id="repo" className="mb-8 mt-10 text-xs text-[var(--text-secondary)]">
        The S2 Arena repo is not public yet. This page will link to it after the release.
      </p>
    </ArticleShell>
  );
}
