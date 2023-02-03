class Config:
    network_name: str
    config_name: str
    seed_set: int
    sim_time_limit: float

    def __init__(self, network_name: str, config_name: str = "Custom") -> None:
        self.network_name = network_name
        self.config_name = config_name
        self.seed_set = 0
        self.sim_time_limit = 100

    def dump(self) -> str:
        return f"""
[General]
seed-set = \\${{runnumber}}
sim-time-limit = {self.sim_time_limit}s

image-path = "./quisp/images"
**.logger.log_filename = "/result.jsonl"
**.tomography_output_filename = "/result.output"
**.speed_of_light_in_fiber = 205336.986301 km

**.h_gate_error_rate = 1/2000
**.h_gate_x_error_ratio = 0
**.h_gate_y_error_ratio = 0
**.h_gate_z_error_ratio = 0

**.Measurement_error_rate = 1/2000
**.Measurement_x_error_ratio = 1
**.Measurement_y_error_ratio = 1
**.Measurement_z_error_ratio = 1

**.x_gate_error_rate = 1/2000
**.x_gate_x_error_ratio = 0
**.x_gate_y_error_ratio = 0
**.x_gate_z_error_ratio = 0

**.z_gate_error_rate = 1/2000
**.z_gate_x_error_ratio = 0
**.z_gate_y_error_ratio = 0
**.z_gate_z_error_ratio = 0


#Error on Target, Error on Controlled
**.cnot_gate_error_rate = 1/2000
**.cnot_gate_iz_error_ratio = 1
**.cnot_gate_zi_error_ratio = 1
**.cnot_gate_zz_error_ratio = 1
**.cnot_gate_ix_error_ratio = 1
**.cnot_gate_xi_error_ratio = 1
**.cnot_gate_xx_error_ratio = 1
**.cnot_gate_iy_error_ratio = 1
**.cnot_gate_yi_error_ratio = 1
**.cnot_gate_yy_error_ratio = 1

**.memory_x_error_rate = 1.11111111e-7
**.memory_y_error_rate = 1.11111111e-7
**.memory_z_error_rate = 1.11111111e-7
**.memory_energy_excitation_rate = 0.000198
**.memory_energy_relaxation_rate = 0.00000198
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


**.emission_success_probability = 0.46*0.49

# Error on optical qubit in a channel
**.channel_loss_rate = 0.04500741397 # per km. 1 - 10^(-0.2/10)
**.channel_x_error_rate = 0.01
**.channel_z_error_rate = 0.01
**.channel_y_error_rate = 0.01

# Internal HOM in QNIC
**.internal_hom_loss_rate = 0
**.internal_hom_error_rate = 0 #Not inplemented
**.internal_hom_required_precision = 1.5e-9 #Schuck et al., PRL 96,
**.internal_hom_photon_detection_per_sec = 1000000000
**.internal_hom_darkcount_probability = 10e-8 #10/s * 10^-9

#Stand-alone HOM in the network
**.hom_loss_rate = 0
**.hom_error_rate = 0 #Not inplemented
**.hom_required_precision = 1.5e-9 #Schuck et al., PRL 96,
**.hom_photon_detection_per_sec = 1000000000
**.hom_darkcount_probability = 10e-8 #1%

**.link_tomography = false
**.EndToEndConnection = true
**.initial_purification = 2
**.purification_type = 1001
"""
