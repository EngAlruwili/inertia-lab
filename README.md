# ⚡ Inertia Lab

**What happens when a power grid loses its spinning mass?**

An interactive, browser-based simulator that shows how replacing synchronous generators with inverter-based renewables erodes grid inertia, and how a **grid-forming battery (virtual synchronous machine)** restores frequency stability where a conventional **grid-following** battery cannot.

> Built by **Abdullah Alruwaili**, Electrical Power Engineering

**Live demo:** `https://engalruwili.github.io/inertia-lab/`

---

## Why this matters

Every thermal, hydro and nuclear unit stores kinetic energy in a rotor spinning in lock-step with the grid. When a large generator trips, that stored energy is released instantly and slows the frequency decline. This is **inertia**.

Solar PV and wind connect through power electronics and contribute **zero** inertia. As their share grows:

- the **Rate of Change of Frequency (RoCoF)** after a trip rises sharply,
- the **frequency nadir** drops deeper,
- **under-frequency load shedding** disconnects customers, and RoCoF protection may trip distributed generation, leading to cascading failure.

Real-world wake-up calls include South Australia (2016), the UK (9 August 2019) and the Iberian Peninsula (2025). Grid operators in Australia, the UK and Europe now procure **grid-forming** inverters to address this.

## What the simulator shows

| View | Insight |
|---|---|
| **Generation fleet** | Spinning turbines vs. solar units. Rotors visibly slow down as frequency falls. |
| **Frequency after the trip** | Side-by-side response: no support vs. grid-following vs. grid-forming battery. |
| **The inertia cliff** | Frequency nadir swept across 0–95 % renewable share: the point where the grid tips over. |
| **Who saves the grid?** | Power contributed by governors, the battery and load shedding over time. |
| **KPIs** | Nadir, RoCoF (500 ms window), load shed and a security verdict for each strategy. |

### Example result ("On the edge" preset: 90 % renewables, 1,800 MW trip, 1,500 MW battery)

| Strategy | Nadir | Max RoCoF | Load shed | Verdict |
|---|---|---|---|---|
| No battery support | 48.46 Hz | 3.87 Hz/s | 3.0 GW | ❌ RoCoF trip risk |
| Grid-following battery | 48.65 Hz | 3.84 Hz/s | 2.0 GW | ❌ RoCoF trip risk |
| **Grid-forming battery** | **49.46 Hz** | **0.96 Hz/s** | **0 GW** | ✅ Secure |

Same battery, same megawatts. Only the control philosophy changes.

## The model

An aggregated single-bus **System Frequency Response (SFR)** model, integrated with a 1 ms explicit step:

```
2·H_sys · dΔf/dt = ΔP_gov + ΔP_bess + ΔP_shed − ΔP_loss − D·Δf
H_sys = H_sync · (1 − RES share)
```

| Component | Implementation |
|---|---|
| Synchronous fleet | Droop governor (R = 5 %) → reheat steam turbine (T_g = 0.2 s, T_r = 7 s, F_HP = 0.3), headroom limited to 10 % of online capacity |
| Load | Frequency-dependent damping D = 1 pu/pu |
| Grid-following BESS | PLL measurement lag 100 ms, 250 ms detection delay, 150 ms converter lag, 1 % droop, power-limited |
| Grid-forming BESS (VSM) | Virtual inertia H_v = 6 s + 1 % droop, 20 ms response, power-limited |
| UFLS | 5 stages × 5 % load, 49.0 → 48.2 Hz, 150 ms relay delay |
| Limits | RoCoF protection 1 Hz/s (500 ms window), collapse at 47.5 Hz |

Full derivation and assumptions: [`docs/MODEL.md`](docs/MODEL.md).

### Validation

`tests/model.test.mjs` checks the numerical solver against closed-form results:

- initial RoCoF = ΔP·f₀ / 2H_sys (analytical vs. simulated slope),
- steady-state deviation Δf_ss = −ΔP / (1/R + D),
- monotonic loss of stability with renewable share,
- grid-forming > grid-following > no support.

```bash
npm test
```

## Run locally

No build step and no dependencies beyond Chart.js (loaded from a CDN).

```bash
git clone https://github.com/EngAlruwili/inertia-lab.git
cd inertia-lab
npm start            # serves on http://localhost:8080
```

## Deploy to GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / root. The site is static.

## Project structure

```
inertia-lab/
├── index.html          # UI
├── src/
│   ├── model.js        # SFR physics engine (pure, testable)
│   ├── app.js          # charts, playback, controls
│   └── styles.css
├── tests/model.test.mjs
├── docs/MODEL.md       # equations & assumptions
└── media/              # LinkedIn post & video script
```

## Limitations

This is an educational, aggregated model. It ignores network topology, voltage dynamics, inter-area oscillations and inverter current limits during faults. Use it to build intuition, not for planning studies (use PSS®E, PowerFactory or EMT tools for those).

## Author

**Abdullah Alruwaili**, Electrical Power Engineering.
Feedback and pull requests are welcome.

## License

[MIT](LICENSE) © 2026 Abdullah Alruwaili
