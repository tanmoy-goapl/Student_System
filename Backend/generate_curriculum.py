import json
import os

curriculum_dir = "curriculum"
if not os.path.exists(curriculum_dir):
    os.makedirs(curriculum_dir)

semesters = [
    {
        "id": "semester-1",
        "title": "Semester 1",
        "iconName": "GraduationCap",
        "color": "#a78bfa",
        "subjects": {
            "Engineering Physics": {
                "Classical Mechanics": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["Newton's Laws", "Work and Energy", "Rotational Dynamics", "Oscillations"]
                },
                "Wave Optics": {
                    "difficulty": "Medium",
                    "estimated_hours": 3,
                    "subtopics": ["Interference", "Diffraction", "Polarization"]
                },
                "Electromagnetism": {
                    "difficulty": "Hard",
                    "estimated_hours": 5,
                    "subtopics": ["Gauss's Law", "Ampere's Law", "Faraday's Law", "Maxwell's Equations"]
                },
                "Quantum Mechanics": {
                    "difficulty": "Hard",
                    "estimated_hours": 4,
                    "subtopics": ["Wave-Particle Duality", "Schrödinger Equation", "Uncertainty Principle"]
                }
            },
            "Engineering Mathematics I": {
                "Differential Calculus": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["Limits and Continuity", "Successive Differentiation", "Partial Derivatives", "Maxima and Minima"]
                },
                "Integral Calculus": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["Definite Integrals", "Multiple Integrals", "Applications of Integration"]
                },
                "Linear Algebra": {
                    "difficulty": "Hard",
                    "estimated_hours": 5,
                    "subtopics": ["Matrices", "Determinants", "System of Linear Equations", "Eigenvalues and Eigenvectors"]
                }
            },
            "Basic Electrical Engineering": {
                "DC Circuits": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["Ohm's Law", "Kirchhoff's Laws", "Mesh and Nodal Analysis", "Network Theorems"]
                },
                "AC Circuits": {
                    "difficulty": "Hard",
                    "estimated_hours": 5,
                    "subtopics": ["Single Phase AC", "Phasors", "Resonance", "Three Phase Systems"]
                },
                "Electrical Machines": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["Transformers", "DC Machines", "Induction Motors"]
                }
            },
            "Programming for Problem Solving": {
                "Introduction to Programming": {
                    "difficulty": "Easy",
                    "estimated_hours": 2,
                    "subtopics": ["Algorithms", "Flowcharts", "Basic Structure of C Program"]
                },
                "Control Flow": {
                    "difficulty": "Easy",
                    "estimated_hours": 3,
                    "subtopics": ["Conditionals", "Loops", "Switch Case", "Break and Continue"]
                },
                "Functions": {
                    "difficulty": "Medium",
                    "estimated_hours": 3,
                    "subtopics": ["Function Declaration", "Parameter Passing", "Recursion"]
                },
                "Arrays and Strings": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["1D Arrays", "Multi-dimensional Arrays", "String Operations"]
                },
                "Pointers and Structures": {
                    "difficulty": "Hard",
                    "estimated_hours": 5,
                    "subtopics": ["Pointer Arithmetic", "Pointers and Arrays", "Dynamic Memory Allocation", "Structures and Unions"]
                }
            }
        }
    },
    {
        "id": "semester-2",
        "title": "Semester 2",
        "iconName": "BookOpen",
        "color": "#60a5fa",
        "subjects": {
            "Engineering Chemistry": {
                "Water Technology": {
                    "difficulty": "Easy",
                    "estimated_hours": 3,
                    "subtopics": ["Hardness of Water", "Water Softening", "Desalination"]
                },
                "Polymers": {
                    "difficulty": "Medium",
                    "estimated_hours": 3,
                    "subtopics": ["Classification of Polymers", "Polymerization Techniques", "Conducting Polymers"]
                },
                "Electrochemistry": {
                    "difficulty": "Hard",
                    "estimated_hours": 4,
                    "subtopics": ["Nernst Equation", "Batteries", "Corrosion and Prevention"]
                }
            },
            "Engineering Mathematics II": {
                "Differential Equations": {
                    "difficulty": "Hard",
                    "estimated_hours": 6,
                    "subtopics": ["First Order ODE", "Higher Order Linear ODE", "Partial Differential Equations"]
                },
                "Vector Calculus": {
                    "difficulty": "Medium",
                    "estimated_hours": 5,
                    "subtopics": ["Gradient, Divergence, Curl", "Line Integrals", "Green's, Stokes', and Gauss Divergence Theorems"]
                },
                "Complex Variables": {
                    "difficulty": "Hard",
                    "estimated_hours": 5,
                    "subtopics": ["Analytic Functions", "Cauchy-Riemann Equations", "Complex Integration", "Residue Theorem"]
                }
            },
            "Data Structures": {
                "Introduction to Data Structures": {
                    "difficulty": "Easy",
                    "estimated_hours": 2,
                    "subtopics": ["Abstract Data Types", "Time and Space Complexity", "Asymptotic Notations"]
                },
                "Linear Data Structures": {
                    "difficulty": "Medium",
                    "estimated_hours": 6,
                    "subtopics": ["Arrays", "Linked Lists", "Stacks", "Queues"]
                },
                "Non-Linear Data Structures": {
                    "difficulty": "Hard",
                    "estimated_hours": 7,
                    "subtopics": ["Trees", "Binary Search Trees", "Heaps", "Graphs"]
                },
                "Sorting and Searching": {
                    "difficulty": "Medium",
                    "estimated_hours": 5,
                    "subtopics": ["Linear Search", "Binary Search", "Bubble Sort", "Merge Sort", "Quick Sort"]
                }
            },
            "Basic Electronics Engineering": {
                "Semiconductor Devices": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["PN Junction Diode", "Zener Diode", "Bipolar Junction Transistor", "FET"]
                },
                "Digital Electronics": {
                    "difficulty": "Medium",
                    "estimated_hours": 5,
                    "subtopics": ["Number Systems", "Boolean Algebra", "Logic Gates", "Combinational Circuits"]
                },
                "Operational Amplifiers": {
                    "difficulty": "Hard",
                    "estimated_hours": 4,
                    "subtopics": ["Ideal Op-Amp", "Inverting and Non-Inverting Amplifiers", "Applications"]
                }
            }
        }
    },
    {
        "id": "semester-3",
        "title": "Semester 3",
        "iconName": "Cpu",
        "color": "#f43f5e",
        "subjects": {
            "Discrete Mathematics": {
                "Logic and Proofs": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["Propositional Logic", "Predicates and Quantifiers", "Methods of Proof"]
                },
                "Sets, Relations, and Functions": {
                    "difficulty": "Easy",
                    "estimated_hours": 3,
                    "subtopics": ["Set Operations", "Properties of Relations", "Equivalence Relations", "Types of Functions"]
                },
                "Combinatorics": {
                    "difficulty": "Hard",
                    "estimated_hours": 5,
                    "subtopics": ["Pigeonhole Principle", "Permutations and Combinations", "Recurrence Relations", "Generating Functions"]
                },
                "Graph Theory": {
                    "difficulty": "Hard",
                    "estimated_hours": 6,
                    "subtopics": ["Graph Models", "Euler and Hamilton Paths", "Trees and Applications"]
                }
            },
            "Object Oriented Programming": {
                "OOP Concepts": {
                    "difficulty": "Easy",
                    "estimated_hours": 2,
                    "subtopics": ["Classes and Objects", "Encapsulation", "Abstraction", "Message Passing"]
                },
                "Inheritance and Polymorphism": {
                    "difficulty": "Medium",
                    "estimated_hours": 4,
                    "subtopics": ["Types of Inheritance", "Method Overriding", "Method Overloading", "Virtual Functions"]
                },
                "Advanced C++ / Java Features": {
                    "difficulty": "Hard",
                    "estimated_hours": 5,
                    "subtopics": ["Templates/Generics", "Exception Handling", "File I/O", "Multithreading"]
                }
            },
            "Digital Logic Design": {
                "Boolean Algebra and Logic Gates": {
                    "difficulty": "Easy",
                    "estimated_hours": 3,
                    "subtopics": ["Boolean Theorems", "K-Maps", "Logic Families"]
                },
                "Combinational Logic": {
                    "difficulty": "Medium",
                    "estimated_hours": 5,
                    "subtopics": ["Adders and Subtractors", "Multiplexers", "Decoders", "Encoders"]
                },
                "Sequential Logic": {
                    "difficulty": "Hard",
                    "estimated_hours": 6,
                    "subtopics": ["Flip-Flops", "Registers", "Counters", "State Machines"]
                }
            },
            "Computer Organization and Architecture": {
                "Basic Structure of Computers": {
                    "difficulty": "Easy",
                    "estimated_hours": 3,
                    "subtopics": ["Von Neumann Architecture", "Bus Structures", "Performance Metrics"]
                },
                "Instruction Set Architecture": {
                    "difficulty": "Medium",
                    "estimated_hours": 5,
                    "subtopics": ["Addressing Modes", "Instruction Formats", "Assembly Language"]
                },
                "Processing Unit": {
                    "difficulty": "Hard",
                    "estimated_hours": 6,
                    "subtopics": ["Datapath Design", "Control Unit Design", "Pipelining Hazards"]
                },
                "Memory System": {
                    "difficulty": "Medium",
                    "estimated_hours": 5,
                    "subtopics": ["Cache Memory", "Virtual Memory", "Memory Hierarchy"]
                }
            }
        }
    }
]

for idx, sem_data in enumerate(semesters):
    sem_number = idx + 1
    filename = os.path.join(curriculum_dir, f"semester{sem_number}.json")
    with open(filename, "w") as f:
        json.dump(sem_data, f, indent=4)
        print(f"Created {filename}")
