#!/bin/bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/game/blackhole-simulator/BlackHoleSimulator
TASK=$(cat /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/game/blackhole-simulator/.dispatch_task.md)
opencode --model deepseek << EOF
$TASK
EOF
