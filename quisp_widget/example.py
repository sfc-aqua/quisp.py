#!/usr/bin/env python
# coding: utf-8

# Copyright (c) zigen.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget
from traitlets import Unicode
from ._frontend import module_name, module_version


class ExampleWidget(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('ExampleModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('ExampleView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = Unicode('Hello World').tag(sync=True)


    def __init__(self):
        super().__init__()
        self.layout.width = "100%"

    def run(self):
        self.send({'msg': 'runNormal'})

    def runStep(self):
        self.send({'msg': 'runStep'})

    def runFast(self):
        self.send({'msg': 'runFast'})

    def stop(self):
        self.send({'msg': 'stop'})

class QuispWidget(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('QuispIFrameModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('QuispIFrameView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = Unicode('Hello World').tag(sync=True)


    def __init__(self):
        super().__init__()
        self.layout.width = "100%"

    def run(self):
        self.send({'msg': 'runNormal'})

    def runStep(self):
        self.send({'msg': 'runStep'})

    def runFast(self):
        self.send({'msg': 'runFast'})

    def stop(self):
        self.send({'msg': 'stop'})

