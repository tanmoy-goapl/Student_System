# Deadlocks  
**Subject:** Operating Systems  

---  

## 1. Introduction & Definition  

A **deadlock** is a situation in a multiprogramming environment where a set of two or more processes are each waiting for an event that can be caused only by another process in the same set, so that none of them can ever proceed. Formally, a deadlock exists when there is a circular wait among a collection of processes, each holding at least one resource and requesting another that is held by a different process in the cycle.  

The term originated in the 1960s when early time‑sharing systems such as the IBM 360 operating system began to support concurrent I/O and memory allocation. Researchers (notably Coffman, Elphick, and Shoshani in 1971) identified four necessary conditions for a deadlock and coined the phrase “deadlock” to describe this pathological state. In modern operating systems, deadlocks are a fundamental correctness concern because they can halt parts of the system, waste resources, and degrade overall reliability.  

---

## 2. Core Concepts & Theory  

### 2.1 The Four Coffman Conditions  

1. **Mutual Exclusion** – At least one resource must be non‑shareable; only one process can use it at a time.  
2. **Hold and Wait** – A process is holding at least one resource while simultaneously requesting additional resources.  
3. **No Preemption** – Resources cannot be forcibly taken away from a process; they must be released voluntarily.  
4. **Circular Wait** – A closed chain of processes exists, where each process holds a resource needed by the next process in the chain.  

All four conditions must hold simultaneously for a deadlock to arise. Removing or breaking any one condition guarantees deadlock freedom.

### 2.2 Resource Allocation Graph (RAG)  

A **Resource Allocation Graph** is a directed bipartite graph G = (P ∪ R, E) where  

- **P** = {P1, P2, …, Pn} is the set of process vertices.  
- **R** = {R1, R2, …, Rm} is the set of resource‑type vertices (each may have multiple instances).  
- **E** consists of two kinds of edges:  
  - **Request edge** (Pi → Rj) indicates Pi is waiting for an instance of Rj.  
  - **Assignment edge** (Rj → Pi) indicates Rj is currently allocated to Pi.  

If the graph contains a **cycle**, a deadlock **may** exist. When each resource type has exactly one instance, any cycle is a sufficient condition for deadlock. With multiple instances, a cycle is only a necessary condition; further analysis (e.g., using the **Banker’s algorithm**) is required.

### 2.3 Formal Model – State‑Space View  

The system can be described by a tuple **(Available, Allocation, Request)**  

- **Available** – vector of the number of free instances of each resource type.  
- **Allocation[i][j]** – number of instances of resource j currently allocated to process Pi.  
- **Request[i][j]** – remaining need of Pi for resource j (maximum demand minus Allocation).  

A **safe state** is one where there exists at least one sequence of process completions (a *safe sequence*) such that each process can obtain its needed resources from the currently available pool plus the resources released by previously finished processes. If no such sequence exists, the state is **unsafe**; an unsafe state may lead to deadlock, though it is not yet a deadlock until processes actually block.

### 2.4 Key Algorithms  

| Algorithm | Purpose | Core Idea |
|-----------|---------|-----------|
| **Deadlock Detection** | Determine whether a deadlock currently exists in a system where preemption is not allowed. | Repeatedly search the RAG for processes with no outgoing request edges; remove them and their assignment edges. Remaining processes constitute the deadlocked set. |
| **Banker’s Algorithm (Deadlock Avoidance)** | Prevent the system from ever entering an unsafe state. | Before granting a request, simulate allocation and test whether the resulting state is safe (i.e., a safe sequence exists). Grant only if safety is preserved. |
| **Deadlock Recovery** | Resolve a deadlock after it has been detected. | Either preempt resources from selected victim processes (rollback) or abort selected processes, then restart them later. |

All three algorithms rely on the same underlying data structures (Available, Allocation, Request) and on the concept of a safe sequence.

### 2.5 Data Structures  

- **RAG adjacency lists** – efficient for dynamic insertion/removal of request and assignment edges.  
- **Matrices** – `Allocation[n][m]` and `Request[n][m]` provide O(1) access to a process’s current holdings and needs.  
- **Work vector** – temporary copy of Available used during safety checks in the Banker’s algorithm.  

---

## 3. How It Works (Step‑by‑Step)  

### 3.1 Typical Deadlock Scenario  

1. **Process P1 requests resource R1** → R1 is free → **Assignment edge** R1 → P1 added.  
2. **Process P2 requests resource R2** → R2 is free → **Assignment edge** R2 → P2 added.  
3. **P1 now requests R2** → R2 is held by P2 → **Request edge** P1 → R2 added.  
4. **P2 now requests R1** → R1 is held by P1 → **Request edge** P2 → R1 added.  
5. The RAG now contains a cycle: P1 → R2 → P2 → R1 → P1.  
6. Both processes are blocked; no further progress is possible → deadlock.

### 3.2 Detection Procedure (using RAG)  

- **Step 1:** Build the current RAG from the OS’s resource tables.  
- **Step 2:** Identify all processes with **no outgoing request edges** (i.e., not waiting).  
- **Step 3:** Remove those processes and all their outgoing assignment edges from the graph.  
- **Step 4:** Repeat Steps 2‑3 until no more processes can be removed.  
- **Step 5:** Any remaining processes constitute the deadlocked set; the remaining edges form the deadlock cycle(s).  

### 3.3 Avoidance (Banker’s Algorithm)  

1. **Input:** Available vector, Allocation matrix, Request matrix, maximum demand matrix.  
2. **When a request (Pi, Rj) arrives:**  
   - **Check 1:** If Request[i][j] > Need[i][j] → illegal request → reject.  
   - **Check 2:** If Request[i][j] > Available[j] → insufficient resources → Pi must wait (no state change).  
   - **Tentative Allocation:** Temporarily set Available[j] = Available[j] – Request[i][j]; Allocation[i][j] = Allocation[i][j] + Request[i][j]; Need[i][j] = Need[i][j] – Request[i][j].  
3. **Safety Test:**  
   - Initialize Work = Available (post‑allocation) and Finish[i] = false for all i.  
   - Find a process Pi such that Finish[i] = false and Need[i] ≤ Work.  
   - If found, set Work = Work + Allocation[i]; Finish[i] = true; repeat.  
   - If all Finish[i] become true, the state is safe → **grant** the request permanently.  
   - Otherwise, **rollback** the tentative allocation and make Pi wait.  

### 3.4 Recovery (Preemption)  

- **Select Victim(s):** Choose one or more processes to abort or roll back, typically based on criteria such as least CPU time used, lowest priority, or minimal cost of restart.  
- **Force Release:** Preempt all resources held by the victim(s) and add them back to Available.  
- **Restart:** Victim processes may be restarted from a checkpoint or simply terminated; the system then re‑evaluates pending requests.  

---

## 4. Types & Classifications  

- **Resource‑Based vs. Communication‑Based Deadlocks**  
  - *Resource‑based*: Classic deadlocks involving locks, semaphores, printers, etc.  
  - *Communication‑based*: Occur in message‑passing systems where processes wait indefinitely for messages that never arrive (e.g., two-way handshake deadlock).  

- **Single‑Instance vs. Multiple‑Instance Deadlocks**  
  - *Single‑instance*: Each resource type has exactly one copy; any cycle in the RAG is sufficient for deadlock.  
  - *Multiple‑instance*: Resources have several identical copies; deadlock detection must consider the count of free instances.  

- **Transient vs. Permanent Deadlocks**  
  - *Transient*: May be resolved automatically when a process releases a resource after completing its critical section.  
  - *Permanent*: Persist until external intervention (preemption or abort) occurs.  

- **Lock‑Ordering vs. Lock‑Level Deadlocks**  
  - *Lock‑ordering*: Arise when processes acquire locks in inconsistent orders.  
  - *Lock‑level*: Involve hierarchical locks (e.g., database row lock followed by table lock) that can create cycles across different lock granularity.  

**Pros / Cons of Classifications**  

- Classifying by instance count helps choose the appropriate detection algorithm (simple cycle detection vs. more complex resource‑count analysis).  
- Distinguishing communication deadlocks guides designers to use time‑outs or non‑blocking communication primitives.  
- Recognizing lock‑ordering patterns enables static analysis tools to prevent deadlocks at compile time, but such analysis may be conservative and reject safe programs.  

---

## 5. Real‑World Applications & Examples  

1. **Database Transaction Management**  
   - Two transactions each lock a different row and then request a lock on the other row to enforce a foreign‑key constraint. The DBMS’s lock manager detects the cycle and aborts one transaction, preserving ACID properties.  

2. **Operating‑System File Systems**  
   - A process opens file A, acquires a vnode lock, then attempts to open file B while another process holds B’s lock and requests A’s lock (e.g., during a rename operation). Modern kernels employ lock ordering and deadlock detection to avoid system hangs.  

3. **Distributed Systems – Two‑Phase Commit (2PC)**  
   - Coordinator sends “prepare” messages to participants; each participant may wait for a resource held by another participant before replying. If participants form a circular wait, the protocol can stall. Implementations add time‑outs and abort mechanisms to break the deadlock.  

---

## 6. Common Pitfalls & Edge Cases  

- **Assuming “No Preemption” is Always True**  
  - Many modern OS kernels allow preemption of certain resources (e.g., memory pages via paging). Ignoring this capability can lead to overly pessimistic deadlock analysis.  

- **Treating a Cycle in a Multi‑Instance RAG as a Deadlock**  
  - With multiple identical resources, a cycle does **not** guarantee deadlock; there may still be enough free instances to satisfy all pending requests. Proper detection must count available instances.  

- **Neglecting Indirect Wait‑For Chains**  
  - A process may be waiting for a resource that is itself waiting for another, forming a long chain. Simple pairwise checks miss such indirect cycles; a full graph traversal is required.  

---

## 7. Interview & Exam Preparation  

1. **Question:** *State the four Coffman conditions and explain how breaking each one prevents deadlock.*  
   **Answer:** Mutual exclusion, hold‑and‑wait, no preemption, and circular wait. Removing mutual exclusion (e.g., making resources shareable) eliminates contention; eliminating hold‑and‑wait forces processes to request all needed resources atomically; allowing preemption lets the OS forcibly reclaim resources; breaking circular wait can be done by imposing a global ordering on resource acquisition.  

2. **Question:** *Given Available = (3,2), Allocation = [[1,0],[2,1]], Request = [[1,2],[0,0]], determine whether the system is in a safe state.*  
   **Answer:** Compute Need = Request. Work = (3,2). Process P2’s need (0,0) ≤ Work, so finish P2, release its allocation (2,1) → Work = (5,3). Now P1’s need (1,2) ≤ Work, finish P1. All processes can finish; the state is safe.  

3. **Question:** *Describe how the Banker’s algorithm would handle a request that would lead to an unsafe state.*  
   **Answer:** The algorithm tentatively allocates the requested resources, runs the safety test, discovers that no safe sequence exists, rolls back the tentative allocation, and forces the requesting process to wait, thereby preserving system safety.  

4. **Question:** *What is the difference between deadlock detection and deadlock avoidance?*  
   **Answer:** Detection allows the system to enter unsafe states and periodically checks for cycles, then recovers (e.g., by aborting processes). Avoidance never permits unsafe states; each request is examined in advance using a safety algorithm (Banker’s) and granted only if the resulting state remains safe.  

---

## 8. Summary & Key Takeaways  

- A deadlock is a circular wait among processes holding mutually exclusive resources.  
- Four Coffman conditions are **necessary and sufficient** for deadlock occurrence.  
- **Resource Allocation Graphs** provide a visual and algorithmic basis for detection; a cycle is sufficient for single‑instance resources.  
- **Safe state** ⇔ existence of a *safe sequence*; the Banker’s algorithm enforces safety by refusing unsafe allocations.  
- Detection removes processes with no pending requests iteratively; remaining processes form the deadlocked set.  
- Recovery strategies: **preempt** resources, **abort** victim processes, or **rollback** to checkpoints.  
- Distinguish single‑ vs. multiple‑instance resources, resource‑ vs. communication‑based deadlocks, and transient vs. permanent deadlocks.  
- Real‑world systems (DBMS, file systems, distributed commit protocols) embed deadlock handling mechanisms such as lock ordering, time‑outs, and abort‑restart.  
- Common mistakes: treating any cycle as deadlock in multi‑instance systems, ignoring indirect wait‑for chains, and assuming preemption is never possible.  
- Master the Coffman conditions, RAG analysis, and the Banker’s safety test – they are the core tools for both exam questions and practical OS design.  