# Inertia Lab: Model Documentation

*Author: Abdullah Alruwaili*

## 1. Per-unit system

- Power base: pre-event system demand `P_load` (MW).
- Frequency base: nominal `f₀ = 50 Hz`; `Δf` is in pu.
- The synchronous fleet is assumed to serve `(1 − s)·P_load`, where `s` is the renewable (inverter-based) share.

## 2. Swing equation

```
2·H_sys · dΔf/dt = ΔP_m + ΔP_b + ΔP_shed − ΔP_loss·u(t − t_event) − D·Δf
```

`H_sys = H_sync·(1 − s)` expressed on the load base. Inverter-based resources (grid-following) add no stored kinetic energy.

**Initial RoCoF** (before any controller acts):

```
RoCoF₀ = ΔP_loss · f₀ / (2·H_sys)      [Hz/s]
```

For example, 1,200 MW lost from 20 GW at 50 % renewables with H = 5 s gives `0.06·50 / 5 = 0.6 Hz/s`.

## 3. Governor and reheat turbine

```
P_v,ref = clamp( −(1−s)/R · Δf , ±headroom·(1−s) )
T_g · dP_v/dt = P_v,ref − P_v
T_r · dP_r/dt = P_v − P_r
ΔP_m = F_HP·P_v + (1 − F_HP)·P_r
```

The aggregate governor gain scales with the online synchronous share, so fewer machines give a weaker primary response.

## 4. Battery energy storage

The measured frequency and RoCoF pass through a first-order lag `T_m`:

```
P_b,ref = clamp( −(f_m / R_b)·P_b,rated  −  2·H_v·RoCoF_m·P_b,rated , ±P_b,rated )
T_b · dP_b/dt = P_b,ref − P_b
```

| Mode | Inertia term | Droop | T_m | T_b | Activation delay |
|---|---|---|---|---|---|
| Grid-following (FFR) | no | yes | 100 ms | 150 ms | 250 ms |
| Grid-forming (VSM) | yes (H_v = 6 s) | yes | 20 ms | 20 ms | 0 |

The grid-forming converter behaves as a voltage source behind an impedance. In this aggregated model, its synchronising-power response is represented by an inertial term reacting to RoCoF with near-zero delay.

## 5. Protection

- **UFLS**: five stages of 5 % load at 49.0, 48.8, 48.6, 48.4 and 48.2 Hz, each with a 150 ms definite-time delay.
- **RoCoF**: measured over a 500 ms sliding window; values above 1 Hz/s are flagged as a risk of tripping distributed generation and loss-of-mains relays.
- **Collapse**: frequency at or below 47.5 Hz is treated as a system blackout.

## 6. Numerical method

Explicit forward Euler, `dt = 1 ms` (2 ms for sweeps), 100 Hz output sampling. The smallest time constant is 20 ms, so the step is ≥ 10× smaller.

## 7. Default parameters

| Symbol | Value | Meaning |
|---|---|---|
| H_sync | 5 s | Fleet inertia constant |
| D | 1 | Load damping |
| R | 5 % | Governor droop |
| headroom | 10 % | Spinning reserve |
| T_g, T_r, F_HP | 0.2 s, 7 s, 0.3 | Reheat turbine |
| R_b | 1 % | Battery droop |
| H_v | 6 s | Virtual inertia |

## 8. Limitations

Single-bus (no network), no voltage or angle stability, no converter current limiting under fault, constant-power renewables, and no AGC (secondary control). The model is meant for intuition and education.
