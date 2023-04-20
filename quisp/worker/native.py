from typing import Optional, List, Dict
import asyncio, re, os
from asyncio.subprocess import Process
from enum import Enum
import pandas as pd

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
    error_messages: str = ""
    config: "Optional[Config]"
    df: "Optional[pd.DataFrame]"
    network: "Network"

    def __init__(self, working_dir):
        self.working_dir = working_dir
        self.lock = asyncio.Lock()
        self.df = pd.DataFrame()

    def load(self, network: "Network", config: "Optional[Config]" = None):
        if config is None:
            config = Config(network.name)
        self.config_name = config.config_name
        self.ini_file_path = f"{self.config_name}.ini"
        self.config = config
        self.network = network

        with open(os.path.join(self.working_dir, self.ini_file_path), "w") as file:
            file.write(config.dump())

        with open(
            os.path.join(self.working_dir, "networks", "test_network.ned"), "w"
        ) as file:
            file.write(network.dump())

    def clean_result(self):
        with open(os.path.join(self.working_dir, "result.jsonl"), "w") as f:
            f.write("")

        with open(os.path.join(self.working_dir, "result.output"), "w") as f:
            f.write("")

        with open(os.path.join(self.working_dir, "result.output_dm"), "w") as f:
            f.write("")

    def read_result(self):
        """
        read results from jsonl file and channel info from stdout. this method doesn't collect the density matrix
        """
        self.results = dict()
        # read the stdout
        for result in [parse_output(l) for l in self.output.split("\n")]:
            if not result:
                continue
            self.results[result["name"]] = result

        self.df = pd.read_json(
            os.path.join(self.working_dir, "result.jsonl"), orient="records", lines=True
        )
        self.df.astype({"simtime":"float32", "actual_dest_addr": "string", "actual_src_addr":"string"})

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
            # print(buf)
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
            print(buf)
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
        print(" ".join(commands))
        self.clean_result()
        self.error_messages = ""
        self.proc = await asyncio.create_subprocess_shell(
            # "/usr/bin/time -p -- " + " ".join(commands),
            " ".join(commands),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.working_dir,
        )
        if self.proc.stdout is None or self.proc.stderr is None:
            print("no stdout or stderr")
            return

        while True:
            if self.has_buffer():
                break
            await self.readStdout()
            await self.readStderr()
            await asyncio.sleep(0.1)
        await self.proc.communicate()
        if self.error_messages:
            print(self.error_messages)
            raise RuntimeError(self.error_messages)
        print("finished")


def parse_output(s: str) -> "Optional[Dict]":
    """read one line of simulation output and parse it if it can be.

    >>> parse_output("Repeater1[0]<-->QuantumChannel{cost=0.00795483;distance=2.5km;fidelity=0.647462;bellpair_per_sec=299.875;}<-->EndNode2[0]; Fidelity=0.647462; Xerror=-0.00802559; Zerror=0.352538; Yerror=0.00802559")
    {'name': 'Repeater1[0]<-->EndNode2[0]', 'channel': {'cost': 0.00795483, 'distance': '2.5km', 'fidelity': 0.647462, 'bellpair_per_sec': 299.875}, 'data': {'Fidelity': 0.647462, 'Xerror': -0.00802559, 'Zerror': 0.352538, 'Yerror': 0.00802559}}

    """
    if not "<-->" in s:
        return None
    channel_info, *rest = s.split(" ")
    print(channel_info.split("<-->"))
    node1, channel, node2 = channel_info.split("<-->")
    return {
        "name": f"{node1}<-->{remove_end_semi(node2)}",
        "channel": parse_object(channel[15:-2].split(";")),
        "data": parse_object(rest),
    }


def remove_end_semi(s: str) -> str:
    """remove the last semicolon if exists.

    >>> remove_end_semi("test;")
    'test'

    >>> remove_end_semi("test")
    'test'
    """

    if s.endswith(";"):
        return s[:-1]
    return s


def parse_object(s: "List[str]") -> "Dict[str, float]":
    """parse object literal from simulation results.
    the values are converted into float if it can be.

    >>> parse_object(["Fidelity=0.647462","Xerror=-0.00802559", " Zerror=0.352538", "Yerror=0.00802559;"])
    {'Fidelity': 0.647462, 'Xerror': -0.00802559, 'Zerror': 0.352538, 'Yerror': 0.00802559}

    >>> parse_object("cost=0.00795483;distance=2.5km;fidelity=0.647462;bellpair_per_sec=299.875;".split(";"))
    {'cost': 0.00795483, 'distance': '2.5km', 'fidelity': 0.647462, 'bellpair_per_sec': 299.875}
    """
    obj = dict()
    for kv in s:
        if not kv:
            continue
        k, v = kv.split("=")
        k = k.strip(" ")
        v = remove_end_semi(v)
        try:
            obj[k] = float(v)
        except ValueError:
            obj[k] = v

    return obj
