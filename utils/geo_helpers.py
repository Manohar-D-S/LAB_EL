import osmnx as ox

def snap_to_nearest_node(graph, point: tuple[float, float]):
    """Convert GPS to nearest graph node"""
    return ox.nearest_nodes(graph, X=point[1], Y=point[0])

# core/utils.py
def validate_graph(G):
    if not G or len(G.nodes) == 0:
        raise ValueError("Invalid graph - empty road network")
        
    if not ox.utils_graph.is_strongly_connected(G.to_directed()):
        print("⚠️ Warning: Graph contains disconnected components")