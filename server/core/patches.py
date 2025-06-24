"""
Contains patches for compatibility issues with third-party libraries.
"""
import logging

logger = logging.getLogger(__name__)

def apply_numpy_patches():
    """
    Apply monkey patches for NumPy 2.0 compatibility issues in NetworkX.
    This fixes the np.float_ -> np.float64 change in NumPy 2.0.
    Also ensures 'string' is mapped to str in python_type for GraphMLReader.
    """
    try:
        import networkx as nx
        import numpy as np

        # Fix for GraphMLReader in networkx
        if hasattr(nx.readwrite.graphml, 'GraphMLReader'):
            original_construct_types = nx.readwrite.graphml.GraphMLReader.construct_types

            def patched_construct_types(self):
                """
                Patched version of construct_types that uses np.float64 instead of np.float_
                and ensures 'string' is mapped to str in python_type.
                """
                # Mapping of GraphML types to Python types
                self.xml_type = {
                    "string": str,
                    "boolean": bool,
                    "bool": bool,
                    "int": int,
                    "integer": int,
                    "long": int,
                    "float": float,
                    "double": float,
                    "real": float,
                }

                # Map Python types to GraphML types
                self.python_type = {
                    str: "string",
                    bool: "boolean",
                    int: "int",
                    float: "float",
                    "string": str,  # PATCH: ensure 'string' is mapped to str
                }

                # Map NumPy types to GraphML types
                # Using np.float64 instead of np.float_
                self.numpy_type = [
                    (np.float64, "float"),
                    (np.int64, "int"),
                    (np.int32, "int"),
                    (np.int16, "int"),
                    (np.int8, "int"),
                    (np.uint64, "int"),
                    (np.uint32, "int"),
                    (np.uint16, "int"),
                    (np.uint8, "int"),
                    (np.bool_, "boolean"),
                    (np.str_, "string"),
                ]

            # Apply the patched method
            nx.readwrite.graphml.GraphMLReader.construct_types = patched_construct_types
            logger.info("Applied NumPy 2.0 and GraphMLReader 'string' compatibility patch to NetworkX GraphMLReader")

    except ImportError as e:
        logger.warning(f"Could not apply NumPy patches: {e}")
