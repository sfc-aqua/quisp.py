import pytest

from ..network import Network
from ..qnode import QNode


def test_simple_network():
    network = Network("SimpleTestNetwork")
    qnode1 = QNode(name="qnode1", network=network)
    qnode2 = QNode(name="qnode2", network=network)
    qnode1.connect(qnode2)
    assert len(network.quantum_channels) == 1
    assert len(network.classical_channels) == 1
    assert len(network.qnodes) == 2
    expected = """
package networks;

import modules.*;
import channels.*;
import ned.IdealChannel;
import ned.DatarateChannel;
import modules.Backend.Backend;
import modules.Logger.Logger;

network SimpleTestNetwork {
    submodules:
        backend: Backend;
        logger: Logger;

        qnode1: QNode {
            address = 1;
            node_type = "EndNode";
            @display("i=COMP");
        }
        qnode2: QNode {
            address = 2;
            node_type = "EndNode";
            @display("i=COMP");
        }
    connections:
        qnode1.port++ <--> ClassicalChannel {  distance = 20km; } <--> qnode2.port++;
        qnode1.quantum_port++ <--> QuantumChannel {  distance = 20km; } <--> qnode2.quantum_port++;
}
"""
    assert network.dump() == expected

