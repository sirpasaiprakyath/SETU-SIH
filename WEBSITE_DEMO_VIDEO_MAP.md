# SETU (GUARDIAN MINDS) — COMPLETE WEBSITE DEMONSTRATION MAP
## Feature-Packed, Balanced & Conversational Walkthrough
**Target Audience:** Smart India Hackathon Evaluators, CRPF / MHA Senior Officers, Jury Panel  
**Demo Duration:** ~2 Minutes 45 Seconds *(Starts at 1:00 where your 1-minute video intro finishes, ending at ~3:45)*  
**Core Strategy:** Fast, crisp, enjoyable walkthrough that showcases our **entire range of built features** without over-explaining any single one.

---

### FEATURE COVERAGE MAP AT A GLANCE

| Scene | Route / Page | Real Features Demonstrated | Time |
|:---|:---|:---|:---|
| **Act 1: Login** | `/` (Access Portal) | • MHA Tricolor & SETU Logo<br>• 5-Tier Role Segregation<br>• 1-Click Institutional Demo Logins | **1:00 – 1:12** (12s) |
| **Act 2: Personnel** | `/personnel` (Frontline Jawan) | • Instant Hindi / English Toggle<br>• 60-Second Saathi Sliders (Sleep, Fatigue, Family)<br>• **Vishram Sanctuary** (4-4-4-4 Box Breathing, 0 Tracking)<br>• **Dhvani Voice Check-in** (10s acoustic strain in RAM, 0 audio stored)<br>• **Peer-Guard Tab** (Assigned Buddy & Anonymous Buddy Drop Box) | **1:12 – 1:55** (43s) |
| **Act 3: Section NCO** | `/nco` (Havildar Tablet) | • Rapid Section Roll-Call Muster (<30s for 10 jawans)<br>• 48h–72h Cooldown Cycle Lockout (no over-monitoring)<br>• **Platoon Contextual Filter** (combat fatigue ≠ mental illness) | **1:55 – 2:20** (25s) |
| **Act 4: Doctor & Welfare** | `/doctor` & `/welfare` | • **Doctor Desk**: Monthly Medical Camp Vitals (BP, Sugar, Weight)<br>• **Welfare Triage**: 90-day baseline shift, 82% likelihood<br>• **TreeSHAP Explainable AI**: Top 4 plain-language drivers<br>• **Informal Tea Check-in**: Friendly chat, 0 disciplinary record | **2:20 – 3:00** (40s) |
| **Act 5: Command Radar** | `/command` (Commandant) | • Unit Welfare Radar (Alpha, Bravo, Charlie heatmaps)<br>• Strict Privacy Wall: **Zero Soldier Names or Medical Files** | **3:00 – 3:25** (25s) |
| **Act 6: Admin & Proof** | `/admin` (System & Audit) | • Audited Benchmarks: **90.6% Accuracy, 0.858 AUC, <15ms speed**<br>• Offline-first CRDT Sync for remote border posts<br>• Tamper-proof Dual IST/UTC Audit Register | **3:25 – 3:50** (25s) |

---

## 🎙️ WORD-FOR-WORD CONVERSATIONAL VOICE-OVER SCRIPT

```
================================================================================
ACT 1: THE ACCESS PORTAL & 5 ROLES (1:00 – 1:12)
================================================================================
```
* **On Screen:** `http://localhost:5173/` *(Login Page)*
* **Mouse Action:** Hover on the SETU logo and MHA header. Show the **1-Click Institutional Role Logins** grid. Click **"1. Frontline Personnel (Shifted)"**.
* **🎙️ Voiceover:**
> *"Right after our introduction, let's step directly into the live SETU platform.*
> 
> *A paramilitary force needs strict role separation. That's why SETU gives completely dedicated portals for the soldier, the section leader, the doctor, the welfare officer, and the battalion commander.*
> 
> *Let's log in first as Constable Rajesh Kumar Singh, deployed in an active field sector."*

---

```
================================================================================
ACT 2: THE FRONTLINE JAWAN — BILINGUAL, SAATHI, VISHRAM, DHVANI & PEER GUARD (1:12 – 1:55)
================================================================================
```
* **On Screen:** `/personnel`
* **Mouse Action:**
  1. Click **Language Toggle** in the top bar: *English $\rightarrow$ Hindi $\rightarrow$ English*.
  2. Scroll down to **Saathi Check-in**: smoothly drag *Sleep* (4.5h) and *Duty Fatigue* (High).
  3. Click **Vishram Sanctuary**: let the breathing circle pulse once, point to the *"100% Telemetry-Free"* badge, then close.
  4. Click the **Dhvani (ध्वनि)** button: open the 10-second vocal acoustic modal, point to the live waveform, and close.
  5. Click the **Peer-Guard (साथी सुरक्षा)** tab: show the assigned Buddy Card and point to the **Anonymous Buddy Drop Box**.
* **🎙️ Voiceover:**
  > *"Here is the frontline soldier's mobile view. With one tap, jawans can switch between Hindi and English.*
  > 
  > *First is Saathi: a daily check-in that takes under a minute. It asks zero medical questions—only everyday operational things like sleep, night sentry fatigue, and family contact.*
  > 
  > *Second is Vishram: an air-gapped recovery space with calming box-breathing and flute music. It is completely telemetry-free—zero logs, zero database rows, and zero commander spying.*
  > 
  > *Third is our Dhvani voice engine: a quick ten-second check-in that detects vocal pitch strain entirely inside the phone's temporary RAM. The audio buffer is wiped in milliseconds—zero voice audio is ever recorded or uploaded.*
  > 
  > *And fourth, under the Peer-Guard tab, soldiers see their designated buddy pair and can drop a quiet, anonymous note in the Buddy Drop Box if they notice a friend skipping meals or withdrawing."*

---

```
================================================================================
ACT 3: THE SECTION HAVILDAR — 30-SECOND MUSTER & PLATOON FILTER (1:55 – 2:20)
================================================================================
```
* **On Screen:** Click top-right user menu $\rightarrow$ switch to **"3. Section NCO / Havildar"** (`nco_demo` — Havildar Vikram Rathore).
* **Mouse Action:**
  1. Show the **Section Roll-Call Muster**: point to the 10 soldiers and click a couple of observation scores (1 to 4).
  2. Point to the **48h–72h Cooldown Lockout** indicator.
  3. Point to the **Platoon Contextual Filter** card.
* **🎙️ Voiceover:**
  > *"Next, we switch to the Section Havildar on his tactical field tablet.*
  > 
  > *The Havildar completes a rapid muster roll-call for his entire ten-man squad in under thirty seconds. A smart forty-eight-hour cooldown lockout prevents micromanagement.*
  > 
  > *More importantly, this powers our Platoon Contextual Filter: if an entire squad is exhausted after a seventy-two-hour jungle ambush, SETU recognizes unit-wide combat fatigue—ensuring healthy combat soldiers are never wrongly flagged with psychiatric illness."*

---

```
================================================================================
ACT 4: DOCTOR CAMP & WELFARE TRIAGE WITH TREESHAP (2:20 – 3:00)
================================================================================
```
* **On Screen:**
  1. Switch to **"4. Doctor / Medical Officer"** (`doctor_demo` — Dr. Maninderjit Singh) for 8 seconds.
  2. Show the **Monthly Medical Camp Vitals roster** (BP, Blood Sugar, Weight, Heart Rate).
  3. Switch to **"5. Welfare Officer"** (`welfare_demo` — Dr. Ananya Sharma).
  4. Look at the **Triage Queue**: point to **Ct. Rajesh Kumar Singh (82%)**.
  5. Point directly to the **TreeSHAP Explainable AI** breakdown:
     * *Sleep Disruption (+42%)*
     * *Consecutive Night Shifts (+31%)*
     * *Buddy Notice (+18%)*
     * *Leave Delay (+9%)*
  6. Point to the **"Schedule Tea Check-in"** button.
* **🎙️ Voiceover:**
  > *"At the unit dispensary, our Medical Officer logs routine camp vitals—blood pressure, blood sugar, and physical health.*
  > 
  > *Over at the Welfare Desk, SETU analyzes these signals against each soldier's personal ninety-day baseline.*
  > 
  > *Constable Rajesh is flagged at eighty-two percent. But instead of black-box AI guessing, TreeSHAP explains the exact reasons in plain language: forty-two percent from sleep disruption, thirty-one percent from night sentry shifts, eighteen percent from a buddy notice, and nine percent from delayed leave.*
  > 
  > *The officer immediately knows what to do: she clicks one button to schedule a friendly, informal cup of tea—confidential, warm, and resolving stress long before it becomes serious."*

---

```
================================================================================
ACT 5: THE BATTALION COMMANDANT — UNIT RADAR & STRICT PRIVACY (3:00 – 3:25)
================================================================================
```
* **On Screen:** Click top-right user menu $\rightarrow$ switch to **"6. Command / Unit Leadership"** (`command_demo` — Cmdt. Arvind Joshi).
* **Mouse Action:**
  1. Show the **Unit Welfare Radar** with company fatigue heatmaps (*Alpha, Bravo, Charlie*).
  2. Point your cursor to the green badge: **"Strict Privacy Boundary Active: Zero Individual Names Displayed"**.
* **🎙️ Voiceover:**
  > *"Now, what does the Battalion Commandant see?*
  > 
  > *Commanders view only the Unit Welfare Radar: real-time, aggregated company heatmaps. A commander sees that Charlie Company has accumulated high operational fatigue and needs rest rotation.*
  > 
  > *Crucially, look at this strict privacy badge: commanders see zero soldier names, zero personal check-ins, and zero medical files—balancing mission planning with absolute soldier privacy."*

---

```
================================================================================
ACT 6: AUDITED BENCHMARKS, OFFLINE CRDT & CLOSING (3:25 – 3:50)
================================================================================
```
* **On Screen:** Click top-right user menu $\rightarrow$ switch to **"7. Security & Audit Admin"** (`admin_demo`) or click **About**.
* **Mouse Action:** Point to the **Audited Benchmarks (90.6% Accuracy, 0.858 AUC, <15ms speed)**, the **CRDT Offline Mesh Architecture** tab, and the dual IST/UTC audit log.
* **🎙️ Voiceover:**
  > *"Under the hood, SETU was benchmarked across four thousand operational records, hitting over ninety percent accuracy and zero guesswork.*
  > 
  > *It runs in under fifteen milliseconds, syncs offline over peer-to-peer mesh in remote border outposts, and records every single access in an immutable audit ledger.*
  > 
  > *SETU bridges operational readiness with human soldier welfare—ensuring the brave personnel protecting our nation are never left unguarded themselves.*
  > 
  > *Thank you, and Jai Hind!"*

---

### 🎯 WHY THIS BALANCED PACING WINS EVALUATORS:
1. **Accurate to your built site:** The Buddy Drop Box is in the soldier's **Peer-Guard tab**, while the NCO does the **30s muster roll-call**.
2. **Dhvani gets its spotlight:** Evaluators immediately see the 10-second vocal acoustic engine with RAM-only processing.
3. **No single feature drags on:** Each major capability gets a crisp, punchy 5-to-10 second demonstration.
4. **Natural conversational English:** Flows easily off your tongue without any tongue-twisters!
