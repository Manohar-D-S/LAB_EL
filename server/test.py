from core.routing.graph_builder import fetch_vehicle_graph
from core.routing.a_star import AmbulanceRouter
import osmnx as ox
import matplotlib.pyplot as plt

# SOURCE = (12.97524, 77.60780)  # MG Road
# DEST = (12.939653, 77.597916)     # Vidhana Soudha
# #
def test_ambulance_route(SOURCE: tuple, DEST: tuple) -> None:
    # Get vehicle-specific graph
    G = fetch_vehicle_graph(SOURCE, DEST)
    
    # Calculate route
    start_node = ox.distance.nearest_nodes(G, X=SOURCE[1], Y=SOURCE[0])
    end_node = ox.distance.nearest_nodes(G, X=DEST[1], Y=DEST[0])
    router = AmbulanceRouter(G)
    path = router.astar(start_node, end_node)

    # Simple plot with default OSM styling
    fig, ax = ox.plot_graph_route(
        G, 
        path,
        route_linewidth=6,
        route_color='blue',
        node_size=0,
        show=False,
        close=False
    )
    
    # Add basic labels
    ax.set_title("Bengaluru Ambulance Route", fontsize=12)
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    coordinates = {
        "M G ROAD": (12.97524, 77.60780),
        "NIMHANS": (12.939653, 77.597916),
        "VIDHANA SOUDHA": (12.97882, 77.59171),
        "BTM LAYOUT": (12.93522, 77.61014),
        "JAYADEVA HOSPITAL": (12.93522, 77.61014),
        "DEVIHALLI": (12.90088, 77.62287),
        "KAMAKSHIPALYA": (12.981830, 77.527374),
        "LAKSHMI HOSPITAL": (12.981830, 77.527374)
    }

    print("Select a source and destination from the following coordinates:")
    for i in range(len(coordinates)):
        print(f"{i+1}] {list(coordinates.keys())[i]}: {coordinates[list(coordinates.keys())[i]]}")
    source = int(input("Enter source number: ")) - 1
    dest = int(input("Enter destination number: ")) - 1
    SOURCE = coordinates[list(coordinates.keys())[source]]
    DEST = coordinates[list(coordinates.keys())[dest]]  
    test_ambulance_route(SOURCE, DEST)

