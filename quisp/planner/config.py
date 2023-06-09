from typing import Optional


class Config:
    network_name: str
    config_name: str
    seed_set: int
    sim_time_limit: float

    def __init__(self, network_name: str, config_name: "Optional[str]" = None) -> None:
        self.network_name = network_name
        if config_name is None:
            self.config_name = network_name
        else:
            self.config_name = config_name
        self.seed_set = 0
        self.sim_time_limit = 100

    def dump(self) -> str:
        return f"""
[General]
seed-set = \\${{runnumber}}
sim-time-limit = {self.sim_time_limit}s

image-path = "./quisp/images"
**.logger.log_filename = "./result.jsonl"
**.tomography_output_filename = "./result.output"
**.speed_of_light_in_fiber = 205336.986301 km

**.h_gate_error_rate = 0
**.h_gate_x_error_ratio = 0
**.h_gate_y_error_ratio = 0
**.h_gate_z_error_ratio = 0

**.Measurement_error_rate = 0
**.Measurement_x_error_ratio = 1
**.Measurement_y_error_ratio = 1
**.Measurement_z_error_ratio = 1

**.x_gate_error_rate = 0
**.x_gate_x_error_ratio = 0
**.x_gate_y_error_ratio = 0
**.x_gate_z_error_ratio = 0

**.z_gate_error_rate = 0
**.z_gate_x_error_ratio = 0
**.z_gate_y_error_ratio = 0
**.z_gate_z_error_ratio = 0


#Error on Target, Error on Controlled
**.cnot_gate_error_rate = 0
**.cnot_gate_iz_error_ratio = 1
**.cnot_gate_zi_error_ratio = 1
**.cnot_gate_zz_error_ratio = 1
**.cnot_gate_ix_error_ratio = 1
**.cnot_gate_xi_error_ratio = 1
**.cnot_gate_xx_error_ratio = 1
**.cnot_gate_iy_error_ratio = 1
**.cnot_gate_yi_error_ratio = 1
**.cnot_gate_yy_error_ratio = 1

**.memory_x_error_rate = 0
**.memory_y_error_rate = 0
**.memory_z_error_rate = 0
**.memory_energy_excitation_rate = 0
**.memory_energy_relaxation_rate = 0
**.memory_completely_mixed_rate = 0

# when to start the BSA timing notification.
**.initial_notification_timing_buffer = 10 s
**.TrafficPattern = 1
**.LoneInitiatorAddress = 1

[Config {self.config_name}]
network = networks.{self.network_name}
seed-set = {self.seed_set}
**.number_of_bellpair = 7000
**.buffers = 100


**.link_tomography = false
**.EndToEndConnection = true
**.initial_purification = 2
**.purification_type = 1001
"""
