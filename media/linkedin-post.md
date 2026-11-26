# LinkedIn post (copy-paste ready)

Attach the 60–75 s video, then paste the text below. Put the GitHub and live demo links in the **first comment**; LinkedIn reach drops when the post body contains links.

---

Same battery. Same 1,500 MW.
One setup lets the grid shed 2 GW of customers. The other keeps every light on.

The difference is one line of control code.

I built 𝗜𝗻𝗲𝗿𝘁𝗶𝗮 𝗟𝗮𝗯, an interactive simulator showing what happens to a power grid when renewables replace spinning generators.

Here's the problem 👇

Every gas, coal and nuclear unit stores kinetic energy in a rotor spinning at exactly 50 Hz.
When a large plant trips, that energy buys the grid precious seconds.

Solar and wind connect through inverters.
They store 𝘇𝗲𝗿𝗼.

So I tripped a 1,800 MW plant on a grid running 90% renewables:

• No support → RoCoF 3.9 Hz/s, 3 GW of load shed
• Grid-following battery → still 3.8 Hz/s, 2 GW shed
• Grid-forming battery → 0.96 Hz/s, 0 MW shed ✅

The grid-following battery isn't too small.
It's too 𝗹𝗮𝘁𝗲. It waits ~250 ms to measure frequency before it acts. In a low-inertia grid, that's when the damage happens.

A grid-forming battery behaves like a virtual synchronous machine. It reacts to the rate of change itself, within milliseconds.

What's inside:
→ Swing-equation frequency model with reheat-turbine governors
→ Grid-following vs. grid-forming (VSM) battery control
→ 5-stage under-frequency load shedding
→ The "inertia cliff": nadir swept from 0 to 95% renewables
→ Solver validated against analytical RoCoF and droop results

It runs in your browser. Move the sliders and break the grid yourself.

Live demo + open-source code in the first comment.

#PowerSystems #ElectricalEngineering #GridStability #EnergyTransition #RenewableEnergy #BatteryStorage #GridForming #PowerEngineering

---

## First comment

🔗 Live demo: https://engalruwili.github.io/inertia-lab/
💻 Code (MIT): https://github.com/EngAlruwili/inertia-lab
