#!/usr/bin/env python
# coding: utf-8

# Copyright (c) zigen.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""
from ipywidgets import DOMWidget, CallbackDispatcher
from typing import TYPE_CHECKING, Optional
from traitlets import Unicode, Bool
from ._frontend import module_name, module_version
from .planner import Config
import asyncio

if TYPE_CHECKING:
    from .planner import Network


class QuispWidget(DOMWidget):
    """TODO: Add docstring here"""

    _model_name = Unicode("QuispIFrameModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode("QuispIFrameView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = Unicode("Hello World").tag(sync=True)
    qtenv_ready = Bool(False).tag(sync=True)
    is_gui = Bool(True).tag(sync=True)

    def __init__(self, is_gui: bool = True):
        super().__init__()
        self.layout.width = "100%"
        self.jsonl = None
        self.output = None
        self.is_gui = is_gui
        self.on_msg(self.callback, remove=False)

    def callback(self, widget, content, buffers):
        if "jsonl" in content:
            self.jsonl = content["jsonl"]
        if "output" in content:
            self.output = content["output"]

    def run(self):
        self.send({"msg": "runNormal"})

    def runStep(self):
        self.send({"msg": "runStep"})

    def runFast(self):
        self.send({"msg": "runFast"})

    def stop(self):
        self.send({"msg": "stop"})

    def load(self, network: "Network", config: "Optional[Config]" = None):
        if config is None:
            config = Config(network.name)
        inifile = config.dump()
        self.send({"msg": "load", "ned": network.dump(), "ini": inifile})

    def readResult(self):
        self.send({"msg": "readResult"})
