from typing import Optional, List
import asyncio, re, os
from asyncio.subprocess import Process
from enum import Enum

from quisp.planner.config import Config
from quisp.planner.network import Network


class WorkerStatus(Enum):
    WAITING_FOR_TASK = "Waiting for task"
    STARTING = "Starting"
    RUNNING = "Running"
    FINISHING = "Finishing"
    FINISHED = "Finished"
    STOPPED = "Stopped"
    ERROR = "Error"


def parse_time(s: str) -> float:
    """parse `time` command result time."""

    return float(s)


class NativeSimulator:
    quisp_path: str
    ned_path: str = "modules:channels:networks"
    proc: "Optional[Process]"
    output: str = ""
    running: bool = False
    lock: asyncio.Lock
    status: WorkerStatus = WorkerStatus.WAITING_FOR_TASK

    def __init__(self, working_dir):
        self.working_dir = working_dir
        self.lock = asyncio.Lock()

    def load(self, network: "Network", config: "Optional[Config]" = None):
        if config is None:
            config = Config(network.name)
        self.config_name = config.config_name
        self.ini_file_path = f"{self.config_name}.ini"

        with open(os.path.join(self.working_dir, self.ini_file_path), "w") as file:
            file.write(config.dump())

        with open(
            os.path.join(self.working_dir, "networks", "test_network.ned"), "w"
        ) as file:
            file.write(network.dump())

    async def set_status(self, status: "WorkerStatus") -> None:
        async with self.lock:
            if self.status is not WorkerStatus.ERROR:
                self.status = status

    async def readStdout(self):
        lines: "List[str]" = []
        stdout = self.proc.stdout
        # stdout example:
        # ** Event #1225984   t=10.000104015903   Elapsed: 96.8616s (1m 36s)  76% completed  (76% total)
        #     Speed:     ev/sec=9170.57   simsec/sec=9.70194e-08   ev/simsec=9.45231e+10
        #     Messages:  created: 3759524   present: 15381   in FES: 9122

        while len(stdout._buffer) > 0:  # type: ignore
            buf = (await self.proc.stdout.readline()).decode().strip()
            if not buf:
                break
            if buf.startswith("<!> Error"):
                await self.set_status(WorkerStatus.ERROR)
            if buf.startswith("End."):
                self.running = False
                await self.set_status(WorkerStatus.FINISHING)

            if buf.startswith("** Event"):
                if not self.running:
                    self.running = True
                    await self.set_status(WorkerStatus.RUNNING)
                match = re.search(r"Event #(\d+)", buf)
                if match:
                    async with self.lock:
                        self.num_events = int(match.group(1))
            if buf.startswith("Speed:"):
                match = re.search(
                    r"ev/sec=([0-9.]+)\s+simsec/sec=([0-9.\-\+e]+)\s+ev/simsec=([0-9.\-\+e]+)",
                    buf,
                )
                if match:
                    async with self.lock:
                        self.ev_per_sec = float(match.group(1))
                lines.append(re.sub(r"\s+", ",", buf))
            self.output += buf + "\n"

    async def readStderr(self):
        while len(self.proc.stderr._buffer) > 0:  # type: ignore
            buf = (await self.proc.stderr.readline()).decode().strip()
            # parse time command output
            if buf.startswith("real"):
                self.real_time = parse_time(buf.split()[1])
            elif buf.startswith("sys"):
                self.sys_time = parse_time(buf.split()[1])
            elif buf.startswith("user"):
                self.user_time = parse_time(buf.split()[1])
            elif buf:
                # self.context.log("[red]Err: ", buf)
                self.error_messages += buf + "\n"
                await self.set_status(WorkerStatus.ERROR)

    def has_buffer(self) -> bool:
        if self.proc is None:
            return False
        p = self.proc
        if p.stdout is None or p.stderr is None:
            return False
        return p.stdout.at_eof() and p.stderr.at_eof()

    async def run(self):
        commands = [
            "./quisp",
            "-u",
            "Cmdenv",
            "--cmdenv-express-mode=true",
            "-c",
            self.config_name,
            "-f",
            self.ini_file_path,
            "-i",
            self.ned_path,
        ]
        print(commands)
        self.proc = await asyncio.create_subprocess_shell(
            "/usr/bin/time -p -- " + " ".join(commands),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.working_dir,
        )
        if self.proc.stdout is None or self.proc.stderr is None:
            return

        while True:
            if self.has_buffer():
                break
            await self.readStdout()
            await self.readStderr()
            await asyncio.sleep(0.1)
        await self.proc.communicate()
