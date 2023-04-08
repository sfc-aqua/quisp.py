"""
>>> QNodeAddr(3,4)
QNodeAddr(3.4)

>>> QNodeAddr(1,2) == QNodeAddr(1,2)
True

"""


class QNodeAddr:
    network_part: int
    host_part: int

    def __init__(self, network_part: int, host_part: int) -> None:
        self.network_part = network_part
        self.host_part = host_part

    def __str__(self) -> str:
        return f"{self.network_part}.{self.host_part}"

    def __repr__(self) -> str:
        return f"QNodeAddr({self.__str__()})"

    def dump(self) -> str:
        return self.__str__()

    def __eq__(self, value: object) -> bool:
        """

        >>> QNodeAddr(2,2) == QNodeAddr(1,2)
        False

        >>> QNodeAddr(5,2) == QNodeAddr(5,2)
        True
        """
        if not isinstance(value, QNodeAddr):
            return False
        return (
            self.network_part == value.network_part
            and self.host_part == value.host_part
        )
