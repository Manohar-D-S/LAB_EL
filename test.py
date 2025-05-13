from core.routing.graph_builder import fetch_osm_graph
from core.routing.a_star import EmergencyRouter
from core.traffic import TrafficSimulator
import osmnx as ox
import matplotlib.pyplot as plt

SOURCE = (12.9717, 77.6091)  # MG Road
DEST = (12.9796, 77.590)     # Vidhana Soudha

def calculate_route_metrics(G, path):
    """Calculate total distance and time for route"""
    total_length = sum(G.edges[u, v, 0]['length'] for u, v in zip(path[:-1], path[1:]))
    total_time = sum(G.edges[u, v, 0]['travel_time'] for u, v in zip(path[:-1], path[1:]))
    return {
        'distance_km': round(total_length/1000, 2),
        'time_mins': round(total_time/60, 1)
    }

def test_astar():
    print("🛠️ Testing Routes with Constant Traffic...")
    
    # 1. Get base graph
    G = fetch_osm_graph(SOURCE, DEST)
    
    # 2. Apply constant traffic model
    G_traffic = TrafficSimulator.apply_constant_congestion(G.copy())
    
    # 3. Find nodes
    start_node = ox.distance.nearest_nodes(G, X=SOURCE[1], Y=SOURCE[0])
    end_node = ox.distance.nearest_nodes(G, X=DEST[1], Y=DEST[0])
    
    # 4. Calculate both routes
    router = EmergencyRouter(G)
    path_fastest = router.astar(start_node, end_node)
    
    router_traffic = EmergencyRouter(G_traffic)
    path_smart = router_traffic.astar(start_node, end_node)
    
    # 5. Metrics comparison
    metrics_fast = calculate_route_metrics(G, path_fastest)
    metrics_smart = calculate_route_metrics(G_traffic, path_smart)
    
    print(f"\n📊 Fastest Route: {metrics_fast['distance_km']} km, {metrics_fast['time_mins']} mins")
    print(f"🚦 Traffic-Aware: {metrics_smart['distance_km']} km, {metrics_smart['time_mins']} mins")
    
    # 6. Visualization
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Plot base map
    ox.plot_graph(
        G,
        ax=ax,
        bgcolor='white',
        edge_color='#dddddd',
        edge_linewidth=0.8,
        node_size=0,
        show=False,
        close=False
    )
    
    # Plot both routes
    ox.plot_graph_route(G, path_fastest, ax=ax, route_linewidth=6, route_color='blue')
    ox.plot_graph_route(G_traffic, path_smart, ax=ax, route_linewidth=6, route_color='red')
    
    # Add legend
    ax.text(0.05, 0.95, 
           "Blue: Fastest Route (No Traffic)\nRed: Traffic-Aware Route\nConstant Traffic Model Applied",
           transform=ax.transAxes,
           bbox=dict(facecolor='white', alpha=0.8),
           fontsize=10)
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    test_astar()