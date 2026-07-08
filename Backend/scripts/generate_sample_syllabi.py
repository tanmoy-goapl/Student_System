import os
from fpdf import FPDF

output_dir = os.path.join(os.path.dirname(__file__), "..", "sample_curriculum")
os.makedirs(output_dir, exist_ok=True)

syllabi = {
    "os_syllabus.pdf": {
        "title": "Operating Systems Syllabus",
        "code": "CS304",
        "semester": "5th Semester",
        "objectives": "To understand the structure and functions of operating systems.",
        "units": [
            ("UNIT 1: Processes", ["Process Concept", "PCB", "Process States"]),
            ("UNIT 2: Scheduling", ["FCFS", "SJF", "Round Robin"]),
            ("UNIT 3: Memory Management", ["Paging", "Segmentation", "Virtual Memory"]),
            ("UNIT 4: Concurrency", ["Mutex", "Semaphores", "Deadlocks"]),
            ("UNIT 5: File Systems", ["File Allocation", "Directory Structure", "Disk Scheduling"]),
        ],
        "outcomes": "Students will be able to design and evaluate scheduling algorithms."
    },
    "dbms_syllabus.pdf": {
        "title": "Database Management Systems",
        "code": "CS305",
        "semester": "5th Semester",
        "objectives": "To learn database design and SQL.",
        "units": [
            ("UNIT 1: Intro to DB", ["Relational Model", "ER Diagrams"]),
            ("UNIT 2: SQL", ["DDL", "DML", "Joins", "Subqueries"]),
            ("UNIT 3: Normalization", ["1NF", "2NF", "3NF", "BCNF"]),
            ("UNIT 4: Transactions", ["ACID Properties", "Concurrency Control", "Locking"]),
            ("UNIT 5: Storage", ["Indexing", "B-Trees", "Hashing"]),
        ],
        "outcomes": "Students will be able to design normalized databases."
    },
    "cn_syllabus.pdf": {
        "title": "Computer Networks",
        "code": "CS306",
        "semester": "6th Semester",
        "objectives": "To understand OSI layers and network protocols.",
        "units": [
            ("UNIT 1: Physical Layer", ["Topology", "Transmission Media"]),
            ("UNIT 2: Data Link Layer", ["Framing", "Error Detection", "MAC"]),
            ("UNIT 3: Network Layer", ["IPv4", "IPv6", "Routing Algorithms"]),
            ("UNIT 4: Transport Layer", ["TCP", "UDP", "Congestion Control"]),
            ("UNIT 5: Application Layer", ["DNS", "HTTP", "SMTP", "FTP"]),
        ],
        "outcomes": "Students will understand end-to-end network communication."
    },
    "dsa_syllabus.pdf": {
        "title": "Data Structures & Algorithms",
        "code": "CS201",
        "semester": "3rd Semester",
        "objectives": "To analyze algorithmic complexity and implement structures.",
        "units": [
            ("UNIT 1: Arrays & Lists", ["Dynamic Arrays", "Linked Lists"]),
            ("UNIT 2: Stacks & Queues", ["LIFO", "FIFO", "Applications"]),
            ("UNIT 3: Trees", ["Binary Trees", "BST", "AVL Trees"]),
            ("UNIT 4: Graphs", ["BFS", "DFS", "Shortest Path"]),
            ("UNIT 5: Sorting & Searching", ["Merge Sort", "Quick Sort", "Binary Search"]),
        ],
        "outcomes": "Students can select appropriate data structures for problem solving."
    }
}

for filename, data in syllabi.items():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt=data["title"], ln=True, align='C')
    
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(200, 10, txt=f"Course Code: {data['code']} | Semester: {data['semester']}", ln=True, align='C')
    pdf.ln(5)
    
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(200, 10, txt="Course Objectives:", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 10, txt=data["objectives"])
    pdf.ln(5)
    
    for unit_title, topics in data["units"]:
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(200, 10, txt=unit_title, ln=True)
        pdf.set_font("Arial", '', 11)
        for t in topics:
            pdf.cell(10, 10, txt="-", ln=False)
            pdf.cell(190, 10, txt=t, ln=True)
        pdf.ln(2)
        
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(200, 10, txt="Learning Outcomes:", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 10, txt=data["outcomes"])
    
    out_path = os.path.join(output_dir, filename)
    pdf.output(out_path)
    print(f"Generated {out_path}")
