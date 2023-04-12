from typing import List, Optional
from .network import Network
from .qnode import QNode
from .qnode_addr import QNodeAddr
from .channel import ChannelOption
import copy


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

    def connect_linear(self, channel_option: "Optional[ChannelOption]" = None):
        if channel_option is None:
            channel_option = ChannelOption()
        for i in range(len(self.qnodes) - 1):
            self.qnodes[i].connect(self.qnodes[i + 1], copy.deepcopy(channel_option))
