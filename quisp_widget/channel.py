from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .network import Network
    from .qnode import QNode


class ClassicalChannel:
    qnode1: "QNode"
    qnode2: "QNode"
    network: "Network"

    def __init__(self, qnode1: "QNode", qnode2: "QNode") -> None:
        self.qnode1 = qnode1
        self.qnode2 = qnode2
        self.network = qnode1.network

class QuantumChannel:
    qnode1: "QNode"
    qnode2: "QNode"
    network: "Network"

    def __init__(self, qnode1: "QNode", qnode2: "QNode") -> None:
        self.qnode1 = qnode1
        self.qnode2 = qnode2
        self.network = qnode1.network

