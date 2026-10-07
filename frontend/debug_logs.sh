#!/bin/bash
docker logs student_frontend --tail 200 2>&1 > /home/galaxy/Desktop/Student_System/frontend/server_logs.txt
docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1 >> /home/galaxy/Desktop/Student_System/frontend/server_logs.txt
