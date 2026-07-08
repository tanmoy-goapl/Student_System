import os
from fpdf import FPDF

def create_syllabus(filename, course_code, course_name, objectives, units):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt=f"{course_code}: {course_name}", ln=1, align="C")
    
    # Semester
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(200, 10, txt="Semester: Fall 2026", ln=1, align="C")
    
    pdf.ln(10)
    
    # Objectives
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="Course Objectives:", ln=1, align="L")
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, txt=objectives)
    
    pdf.ln(5)
    
    # Units
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="Course Content:", ln=1, align="L")
    
    for unit_title, topics in units.items():
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(200, 10, txt=unit_title, ln=1, align="L")
        pdf.set_font("Arial", size=12)
        for t in topics:
            pdf.cell(200, 8, txt=f"- {t}", ln=1, align="L")
        pdf.ln(2)
        
    # Textbooks
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(200, 10, txt="Suggested Books:", ln=1, align="L")
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 8, txt="- Primary Textbook 1", ln=1, align="L")
    pdf.cell(200, 8, txt="- Reference Book A", ln=1, align="L")

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    pdf.output(filename)
    print(f"Generated {filename}")

if __name__ == "__main__":
    os_units = {
        "UNIT 1: Processes": ["Process Concept", "PCB", "Process States"],
        "UNIT 2: Scheduling": ["FCFS", "SJF", "Round Robin"],
        "UNIT 3: Memory Management": ["Paging", "Segmentation", "Virtual Memory"],
        "UNIT 4: Deadlocks": ["Deadlock Characterization", "Banker's Algorithm", "Prevention"],
        "UNIT 5: File Systems": ["File Concept", "Access Methods", "Directory Structure"],
    }
    
    dbms_units = {
        "UNIT 1: Introduction": ["Database Architecture", "Data Models", "ER Diagrams"],
        "UNIT 2: Relational Model": ["Relational Algebra", "Tuple Calculus", "Domain Calculus"],
        "UNIT 3: SQL": ["Basic Queries", "Joins", "Subqueries", "Triggers"],
        "UNIT 4: Normalization": ["1NF", "2NF", "3NF", "BCNF"],
        "UNIT 5: Transaction Processing": ["ACID Properties", "Concurrency Control", "Locking Protocols"],
    }
    
    cn_units = {
        "UNIT 1: Introduction": ["OSI Model", "TCP/IP Protocol Suite", "Network Topologies"],
        "UNIT 2: Physical Layer": ["Transmission Media", "Switching", "Multiplexing"],
        "UNIT 3: Data Link Layer": ["Error Detection", "MAC Sublayer", "Ethernet"],
        "UNIT 4: Network Layer": ["IPv4", "IPv6", "Routing Algorithms"],
        "UNIT 5: Transport & Application Layer": ["TCP", "UDP", "DNS", "HTTP"],
    }
    
    dsa_units = {
        "UNIT 1: Arrays & Strings": ["1D/2D Arrays", "String Matching", "Sliding Window"],
        "UNIT 2: Linked Lists": ["Singly Linked List", "Doubly Linked List", "Circular Lists"],
        "UNIT 3: Stacks & Queues": ["Stack Operations", "Queue Implementations", "Applications"],
        "UNIT 4: Trees & Graphs": ["Binary Trees", "BST", "Graph Traversals (BFS/DFS)"],
        "UNIT 5: Sorting & Searching": ["Binary Search", "Merge Sort", "Quick Sort"],
    }

    base_dir = os.path.dirname(os.path.abspath(__file__))

    create_syllabus(os.path.join(base_dir, "os_syllabus.pdf"), "CS301", "Operating Systems", "Understand the core concepts of Operating Systems and concurrency.", os_units)
    create_syllabus(os.path.join(base_dir, "dbms_syllabus.pdf"), "CS302", "Database Management Systems", "Learn about database design, SQL, and transaction processing.", dbms_units)
    create_syllabus(os.path.join(base_dir, "cn_syllabus.pdf"), "CS303", "Computer Networks", "Study the layered architecture of networks and protocols.", cn_units)
    create_syllabus(os.path.join(base_dir, "dsa_syllabus.pdf"), "CS304", "Data Structures & Algorithms", "Master common data structures and algorithmic paradigms.", dsa_units)
