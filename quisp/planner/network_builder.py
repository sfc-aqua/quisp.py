from typing import List
from .network import Network
from .qnode import QNode
from .qnode_addr import QNodeAddr


class NetworkBuilder:
    network: "Network"
    qnodes: "List[QNode]"

    def __init__(self, network_name: str):
        self.network = Network(network_name)
        self.qnodes = []

    def add_qnode(
        self,
        addrs: "List[QNodeAddr]",
        is_initiator: bool = False,
        is_resipient: bool = False,
    ):
        qnode_name = f"qnode_{len(self.qnodes)}"
        addr, *rest = addrs
        self.qnodes.append(
            QNode(
                self.network,
                name=qnode_name,
                addr=addr,
                available_addresses=rest,
                is_initiator=is_initiator,
                is_recipient=is_resipient,
            )
        )

    def connect_linear(self):
        for i in range(len(self.qnodes) - 1):
            self.qnodes[i].connect(self.qnodes[i + 1])
