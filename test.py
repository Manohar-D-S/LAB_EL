# from core.routing.graph_builder import fetch_osm_graph
# import logging

# # Configure logging
# logging.basicConfig(level=logging.INFO)

# # Test coordinates (MG Road to Victoria Hospital)
# source = (12.9716, 77.5946)  # lat, lon
# destination = (12.9629, 77.5868)  # lat, lon

# try:
#     G = fetch_osm_graph(source, destination)
#     print(f"✅ Success! Graph contains {len(G.nodes)} nodes")
# except Exception as e:
#     print(f"❌ Error: {str(e)}")



from core.routing.graph_builder import fetch_osm_graph
from core.routing.a_star import EmergencyRouter
import osmnx as ox
# Test coordinates (MG Road to Vidhana Soudha)
SOURCE = (12.9716, 77.5946)  # MG Road
DEST = (12.9794, 77.5907)     # Vidhana Soudha

def test_astar():
    print("🛠️ Testing A* Implementation...")
    
    # 1. Get graph
    G = fetch_osm_graph(SOURCE, DEST)
    
    # 2. Find nodes nearest to coordinates
    start_node = ox.distance.nearest_nodes(G, X=SOURCE[1], Y=SOURCE[0])
    end_node = ox.distance.nearest_nodes(G, X=DEST[1], Y=DEST[0])
    
    print(f"Start Node: {start_node} | End Node: {end_node}")
    
    # 3. Calculate route
    router = EmergencyRouter(G)
    path = router.astar(start_node, end_node)
    
    # 4. Validate
    if not path:
        print("❌ Error: No path found!")
        return
    
    print(f"✅ Route found with {len(path)} nodes:")
    print(f"Path: {path[:3]}...{path[-3:]}")  # Show first/last 3 nodes
    
    # 5. Visualize
    ox.plot_graph_route(G, path, route_linewidth=6, node_size=0)

if __name__ == "__main__":
    test_astar()