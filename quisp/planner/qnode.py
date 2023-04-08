from typing import TYPE_CHECKING, List, Optional
from .channel import ClassicalChannel, QuantumChannel, ChannelOption
from .qnode_addr import QNodeAddr

if TYPE_CHECKING:
    from .network import Network


class QNode:
    network: "Network"
    name: str
    channels: List["ClassicalChannel"]
    addr: "QNodeAddr"
    available_addresses: List["QNodeAddr"]
    is_initiator: bool
    is_recipient: bool

    def __init__(
        self,
        network: "Network",
        name: str = "",
        addr: "QNodeAddr" = QNodeAddr(0, 0),
        is_initiator: bool = False,
        is_recipient: bool = False,
        available_addresses: List["QNodeAddr"] = [],
    ) -> None:
        self.network = network
        self.name = name
        self.network.add_qnode(self)
        self.is_initiator = is_initiator
        self.is_recipient = is_recipient
        self.addr = addr
        self.available_addresses = available_addresses

    def connect(self, qnode: "QNode", option: "Optional[ChannelOption]" = None) -> None:
        if option is None:
            option = ChannelOption()
        self.network.add_classical_channel(ClassicalChannel(self, qnode, option))
        self.network.add_quantum_channel(QuantumChannel(self, qnode, option))

    def dump_available_addresses(self) -> str:
        return f"[{', '.join(map(str,self.available_addresses))}]"

    def dump(self) -> str:
        return f"""
        {self.name}: QNode {{
            address = "{self.addr}";
            available_addresses = {self.dump_available_addresses()};
            node_type = "{'EndNode' if self.is_recipient or self.is_initiator else 'Router'}";
            @display("i=COMP");
            is_initiator = {"true" if self.is_initiator else "false"};
        }}"""
