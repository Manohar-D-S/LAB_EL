import osmnx as ox

def snap_to_nearest_node(graph, point: tuple[float, float]):
    """Convert GPS to nearest graph node"""
    return ox.nearest_nodes(graph, X=point[1], Y=point[0])